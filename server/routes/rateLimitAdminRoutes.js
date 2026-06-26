/**
 * rateLimitAdminRoutes.js
 */

import { Router } from 'express';
import { createClient } from 'redis';
import logger from '../utils/logger.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import rateLimit from 'express-rate-limit';

const adminRouteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
import {
  addToWhitelist,
  removeFromWhitelist,
  addToBlacklist,
  removeFromBlacklist,
  unblockIp,
  getWhitelist,
  getBlacklist,
} from '../middleware/throttleMiddleware.js';

const router = Router();

let _redis = null;
async function redis() {
  if (_redis) return _redis;
  try {
    _redis = createClient({ url: process.env.REDIS_URL });
    _redis.on('error', () => {});
    await _redis.connect();
  } catch {
    _redis = null;
  }
  return _redis;
}

async function scanKeys(pattern) {
  const r = await redis();
  if (!r) return [];
  const keys = [];
  for await (const key of r.scanIterator({ MATCH: pattern, COUNT: 200 })) {
    keys.push(key);
  }
  return keys;
}

router.get(
  '/api/admin/rate-limits/status',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const r = await redis();
      const keys = await scanKeys('ratelimit:*');
      const violations = [];
      const endpointCounts = {};
      const userCounts = {};

      for (const key of keys) {
        if (
          key.startsWith('ratelimit:whitelist') ||
          key.startsWith('ratelimit:blacklist') ||
          key.startsWith('ratelimit:autoblock') ||
          key.startsWith('ratelimit:abuse')
        )
          continue;

        const count = r ? parseInt((await r.get(key)) || '0', 10) : 0;
        const ttl = r ? await r.ttl(key) : -1;
        const parts = key.replace('ratelimit:', '').split(':');
        const identifier = parts[0];
        const endpoint = parts.slice(1).join(':') || 'global';

        violations.push({ key, identifier, endpoint, count, ttlSeconds: ttl });
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
        userCounts[identifier] = (userCounts[identifier] || 0) + count;
      }

      const topUsers = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([identifier, count]) => ({ identifier, count }));

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([endpoint, count]) => ({ endpoint, count }));

      const blockedKeys = await scanKeys('ratelimit:autoblock:*');
      const autoblocked = blockedKeys.map((k) => ({ ip: k.replace('ratelimit:autoblock:', '') }));

      res.json({
        totalActiveKeys: violations.length,
        topUsers,
        topEndpoints,
        autoblocked,
        redisConnected: !!r,
      });
    } catch (err) {
      logger.error('rateLimitAdminRoutes /status error', { err: err.message });
      res.status(500).json({ error: 'Failed to fetch rate limit status' });
    }
  }
);

router.get(
  '/api/admin/rate-limits/violations',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const r = await redis();
      const keys = await scanKeys('ratelimit:*');
      const rows = [];

      for (const key of keys) {
        if (key.includes('whitelist') || key.includes('blacklist') || key.includes('autoblock'))
          continue;
        const count = r ? parseInt((await r.get(key)) || '0', 10) : 0;
        const ttl = r ? await r.ttl(key) : -1;
        const parts = key.replace('ratelimit:', '').split(':');
        rows.push({
          identifier: parts[0],
          endpoint: parts.slice(1).join(':') || 'global',
          count,
          ttlSeconds: ttl,
          timestamp: new Date(Date.now() - (ttl > 0 ? (60 - ttl) * 1000 : 0)).toISOString(),
        });
      }

      rows.sort((a, b) => b.count - a.count);
      const start = (parseInt(page) - 1) * parseInt(limit);
      const paginated = rows.slice(start, start + parseInt(limit));
      res.json({ total: rows.length, page: parseInt(page), data: paginated });
    } catch (err) {
      logger.error('rateLimitAdminRoutes /violations error', { err: err.message });
      res.status(500).json({ error: 'Failed to fetch violations' });
    }
  }
);

router.post(
  '/api/admin/rate-limits/override',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const { identifier, limitPerMinute } = req.body;
      if (!identifier || !limitPerMinute)
        return res.status(400).json({ error: 'identifier and limitPerMinute are required' });

      const r = await redis();
      if (r) await r.set(`ratelimit:override:${identifier}`, String(limitPerMinute), { EX: 86400 });

      logger.info('Rate limit override set', {
        identifier,
        limitPerMinute,
        by: req.adminSession?.adminId,
      });
      res.json({ success: true, identifier, limitPerMinute });
    } catch (err) {
      logger.error('rateLimitAdminRoutes /override error', { err: err.message });
      res.status(500).json({ error: 'Failed to set override' });
    }
  }
);

router.delete(
  '/api/admin/rate-limits/override/:identifier',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const r = await redis();
      if (r) await r.del(`ratelimit:override:${req.params.identifier}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove override' });
    }
  }
);

router.get(
  '/api/admin/rate-limits/whitelist',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      res.json({ whitelist: await getWhitelist() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch whitelist' });
    }
  }
);

router.post(
  '/api/admin/rate-limits/whitelist',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ error: 'ip is required' });
      await addToWhitelist(ip);
      logger.info('IP whitelisted', { ip, by: req.adminSession?.adminId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add to whitelist' });
    }
  }
);

router.delete(
  '/api/admin/rate-limits/whitelist/:ip',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      await removeFromWhitelist(req.params.ip);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove from whitelist' });
    }
  }
);

router.get(
  '/api/admin/rate-limits/blacklist',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      res.json({ blacklist: await getBlacklist() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch blacklist' });
    }
  }
);

router.post(
  '/api/admin/rate-limits/blacklist',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ error: 'ip is required' });
      await addToBlacklist(ip);
      logger.info('IP blacklisted', { ip, by: req.adminSession?.adminId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add to blacklist' });
    }
  }
);

router.delete(
  '/api/admin/rate-limits/blacklist/:ip',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      await removeFromBlacklist(req.params.ip);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove from blacklist' });
    }
  }
);

router.post(
  '/api/admin/rate-limits/unblock',
  adminAuthMiddleware.requireAdmin,
  adminRouteLimiter,
  async (req, res) => {
    try {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ error: 'ip is required' });
      await unblockIp(ip);
      logger.info('IP auto-block lifted', { ip, by: req.adminSession?.adminId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to unblock IP' });
    }
  }
);

export default router;
