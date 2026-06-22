import { Router } from 'express';
import { featureFlagsService } from '../services/featureFlagsService.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = Router();
const adminAuth = [apiRateLimiter, adminAuthMiddleware.requireAdmin];

// --- PUBLIC/CLIENT SDK ENDPOINTS ---

/**
 * POST /api/feature-flags/evaluate
 * Evaluates feature flags for a given context.
 */
router.post('/api/feature-flags/evaluate', apiRateLimiter, async (req, res) => {
  try {
    const { flags, context } = req.body;
    if (!Array.isArray(flags)) {
      return res.status(400).json({ error: 'flags must be an array of strings' });
    }

    const results = {};
    for (const key of flags) {
      const flag = await featureFlagsService.getFlagByKey(key);
      if (!flag) {
        results[key] = false;
        continue;
      }

      // If flag is an A/B test, we evaluate and bucket the user
      if (flag.type === 'ab_test' && context?.userId) {
        const group = await featureFlagsService.getABTestGroup(key, context.userId);
        results[key] = group === 'variant';
      } else {
        results[key] = featureFlagsService.evaluateFlag(flag, context || {});
      }
    }

    res.json(results);
  } catch (error) {
    logger.error('Error evaluating feature flags', { error: error.message });
    res.status(500).json({ error: 'Failed to evaluate feature flags' });
  }
});

/**
 * POST /api/feature-flags/ab-test/conversion
 * Tracks conversion for an A/B test group.
 */
router.post('/api/feature-flags/ab-test/conversion', apiRateLimiter, async (req, res) => {
  try {
    const { flagKey, userId } = req.body;
    if (!flagKey || !userId) {
      return res.status(400).json({ error: 'flagKey and userId are required' });
    }

    const tracked = await featureFlagsService.trackABConversion(flagKey, userId);
    res.json({ success: tracked });
  } catch (error) {
    logger.error('Error tracking AB conversion', { error: error.message });
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// --- ADMIN MANAGEMENT ENDPOINTS ---

/**
 * GET /api/admin/feature-flags
 * List all feature flags
 */
router.get('/api/admin/feature-flags', adminAuth, async (req, res) => {
  try {
    const flags = await featureFlagsService.getFlags();
    res.json(flags);
  } catch (error) {
    logger.error('Error fetching feature flags', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

/**
 * GET /api/admin/feature-flags/stale
 * Retrieve stale flags
 */
router.get('/api/admin/feature-flags/stale', adminAuth, async (req, res) => {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : 30;
    const stale = await featureFlagsService.checkStaleFlags(threshold);
    res.json(stale);
  } catch (error) {
    logger.error('Error checking stale flags', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stale flags' });
  }
});

/**
 * GET /api/admin/feature-flags/:key
 * Get a specific flag
 */
router.get('/api/admin/feature-flags/:key', adminAuth, async (req, res) => {
  try {
    const flag = await featureFlagsService.getFlagByKey(req.params.key);
    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    res.json(flag);
  } catch (error) {
    logger.error('Error fetching feature flag', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch feature flag' });
  }
});

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
router.post('/api/admin/feature-flags', adminAuth, async (req, res) => {
  try {
    const { key, name, type } = req.body;
    if (!key || !name || !type) {
      return res.status(400).json({ error: 'key, name, and type are required' });
    }

    const existing = await featureFlagsService.getFlagByKey(key);
    if (existing) {
      return res.status(409).json({ error: `Feature flag with key '${key}' already exists` });
    }

    const changedBy = req.adminUser?.username || 'admin';
    const flag = await featureFlagsService.createFlag(req.body, changedBy);
    res.status(201).json(flag);
  } catch (error) {
    logger.error('Error creating feature flag', { error: error.message });
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

/**
 * PUT /api/admin/feature-flags/:key
 * Update an existing feature flag
 */
router.put('/api/admin/feature-flags/:key', adminAuth, async (req, res) => {
  try {
    const key = req.params.key;
    const existing = await featureFlagsService.getFlagByKey(key);
    if (!existing) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    const changedBy = req.adminUser?.username || 'admin';
    const flag = await featureFlagsService.updateFlag(key, req.body, changedBy);
    res.json(flag);
  } catch (error) {
    logger.error('Error updating feature flag', { error: error.message });
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

/**
 * POST /api/admin/feature-flags/:key/toggle
 * Toggle flag status
 */
router.post('/api/admin/feature-flags/:key/toggle', adminAuth, async (req, res) => {
  try {
    const key = req.params.key;
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active is required' });
    }

    const changedBy = req.adminUser?.username || 'admin';
    const flag = await featureFlagsService.toggleFlag(key, is_active, changedBy);
    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    res.json(flag);
  } catch (error) {
    logger.error('Error toggling feature flag', { error: error.message });
    res.status(500).json({ error: 'Failed to toggle feature flag' });
  }
});

/**
 * DELETE /api/admin/feature-flags/:key
 * Delete a feature flag
 */
router.delete('/api/admin/feature-flags/:key', adminAuth, async (req, res) => {
  try {
    const key = req.params.key;
    const changedBy = req.adminUser?.username || 'admin';
    const success = await featureFlagsService.deleteFlag(key, changedBy);
    if (!success) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting feature flag', { error: error.message });
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

/**
 * GET /api/admin/feature-flags/:key/history
 * Get change history for a flag
 */
router.get('/api/admin/feature-flags/:key/history', adminAuth, async (req, res) => {
  try {
    const history = await featureFlagsService.getFlagHistory(req.params.key);
    res.json(history);
  } catch (error) {
    logger.error('Error fetching feature flag history', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch feature flag history' });
  }
});

/**
 * GET /api/admin/feature-flags/:key/ab-test
 * Get A/B test analytics
 */
router.get('/api/admin/feature-flags/:key/ab-test', adminAuth, async (req, res) => {
  try {
    const analytics = await featureFlagsService.getABTestAnalytics(req.params.key);
    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching AB test analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch A/B test analytics' });
  }
});

/**
 * POST /api/admin/feature-flags/:key/ab-test/reset
 * Reset A/B test metrics
 */
router.post('/api/admin/feature-flags/:key/ab-test/reset', adminAuth, async (req, res) => {
  try {
    await featureFlagsService.resetABTest(req.params.key);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error resetting AB test metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to reset A/B test metrics' });
  }
});

export default router;
