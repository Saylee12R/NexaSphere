/**
 * Portfolio Routes
 * Public portfolio lookup and authenticated create/update
 * with passkey-based auth and brute-force lockout protection.
 */

import { Router } from 'express';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { portfolioContentSchema, portfolioPutSchema } from '../validators/portfolioSchemas.js';
import { protectedActionRateLimiter } from '../middleware/authRateLimiter.js';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import notificationsService from '../services/notificationsService.js';

const router = Router();

// ── Passkey brute-force lockout ────────────────────────────────────────────
// Tracks failed attempts per IP and per username with exponential backoff.
// Hard cap on tracked entries prevents memory exhaustion under attack.

const MAX_PASSKEY_TRACKED_KEYS = 10_000;
const failedPasskeyAttemptsByIp = new Map();
const failedPasskeyAttemptsByUsername = new Map();

// Periodic sweep every 30 minutes: remove entries whose lockout period has
// expired and whose attempt count has already been reset to 0, so they do
// not accumulate for keys that are never visited again.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of failedPasskeyAttemptsByIp) {
      if (entry.count === 0 && now > entry.lockoutUntil) {
        failedPasskeyAttemptsByIp.delete(key);
      }
    }
    for (const [key, entry] of failedPasskeyAttemptsByUsername) {
      if (now > entry.lockoutUntil) {
        failedPasskeyAttemptsByUsername.delete(key);
      }
    }
  },
  30 * 60 * 1000
).unref();

function checkPasskeyLockout(username, ip) {
  const ipKey = String(ip || 'unknown');
  const userKey = String(username || '').toLowerCase();

  const ipEntry = failedPasskeyAttemptsByIp.get(ipKey);
  const userEntry = failedPasskeyAttemptsByUsername.get(userKey);

  const now = Date.now();

  if (ipEntry && ipEntry.lockoutUntil !== 0 && now <= ipEntry.lockoutUntil) {
    return true;
  }

  if (userEntry && userEntry.lockoutUntil !== 0 && now <= userEntry.lockoutUntil) {
    return true;
  }

  // Cleanup expired entries proactively
  if (ipEntry && ipEntry.lockoutUntil !== 0 && now > ipEntry.lockoutUntil) {
    failedPasskeyAttemptsByIp.delete(ipKey);
  }
  if (userEntry && userEntry.lockoutUntil !== 0 && now > userEntry.lockoutUntil) {
    failedPasskeyAttemptsByUsername.delete(userKey);
  }

  return false;
}

function recordFailedPasskeyAttempt(username, ip) {
  const ipKey = String(ip || 'unknown');
  const userKey = String(username || '').toLowerCase();

  // IP tracking
  if (
    !failedPasskeyAttemptsByIp.has(ipKey) &&
    failedPasskeyAttemptsByIp.size >= MAX_PASSKEY_TRACKED_KEYS
  ) {
    failedPasskeyAttemptsByIp.delete(failedPasskeyAttemptsByIp.keys().next().value);
  }
  const ipEntry = failedPasskeyAttemptsByIp.get(ipKey) || { count: 0, lockoutUntil: 0 };
  ipEntry.count += 1;
  if (ipEntry.count >= 5) {
    ipEntry.lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 mins
    ipEntry.count = 0; // Reset count so they need 5 more AFTER lockout to be locked again
  }
  failedPasskeyAttemptsByIp.set(ipKey, ipEntry);

  // Username tracking (Exponential backoff)
  if (
    !failedPasskeyAttemptsByUsername.has(userKey) &&
    failedPasskeyAttemptsByUsername.size >= MAX_PASSKEY_TRACKED_KEYS
  ) {
    failedPasskeyAttemptsByUsername.delete(failedPasskeyAttemptsByUsername.keys().next().value);
  }
  const userEntry = failedPasskeyAttemptsByUsername.get(userKey) || { count: 0, lockoutUntil: 0 };
  userEntry.count += 1;
  if (userEntry.count >= 5) {
    // 5 attempts = 1 min, 6 = 2 mins, 7 = 4 mins, 8 = 8 mins, 9+ = 15 mins
    const factor = Math.pow(2, Math.max(0, userEntry.count - 5));
    const delayMinutes = Math.min(15, factor);
    userEntry.lockoutUntil = Date.now() + delayMinutes * 60 * 1000;
  }
  failedPasskeyAttemptsByUsername.set(userKey, userEntry);

  return { ipEntry, userEntry };
}

function clearPasskeyAttempts(username, ip) {
  const ipKey = String(ip || 'unknown');
  const userKey = String(username || '').toLowerCase();

  failedPasskeyAttemptsByIp.delete(ipKey);
  failedPasskeyAttemptsByUsername.delete(userKey);
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/portfolio/:username — Public portfolio lookup.
 * Returns 404 if the username does not exist.
 */
router.get('/portfolio/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    return res.json(portfolio);
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/portfolio/:username/endorse — Endorse a skill.
 */
router.post(
  '/portfolio/:username/endorse',
  requireStudentAuth,
  protectedActionRateLimiter,
  async (req, res) => {
    try {
      const username = String(req.params.username || '').trim();
      const { skillName } = req.body;
      const endorserId = req.studentUser.id;

      if (!username || !skillName) {
        return res.status(400).json({ error: 'Username and skillName are required' });
      }

      // Prevent self-endorsements (comparing lowercased usernames/ids, but usually endorserId is ID, portfolio is username. Wait!
      // The portfolio is identified by username, the endorser is identified by ID or username from studentUser.
      // If studentUser has username, check against it.
      if (
        req.studentUser.username &&
        req.studentUser.username.toLowerCase() === username.toLowerCase()
      ) {
        return res.status(400).json({ error: 'You cannot endorse your own skills' });
      }

      await portfolioRepository.endorseSkill(username, skillName, endorserId);

      // Trigger a notification to the portfolio owner
      try {
        await notificationsService.addNotification(username, {
          type: 'endorsement',
          priority: 'normal',
          title: 'New Skill Endorsement!',
          message: `Someone just endorsed your skill: ${skillName}.`,
          link: `/portfolio/${username}`,
        });
      } catch (notifErr) {
        console.warn('Failed to send endorsement notification:', notifErr.message);
      }

      return res.json({ success: true, message: 'Skill endorsed successfully' });
    } catch (err) {
      if (
        err.message === 'You have already endorsed this skill' ||
        err.message === 'You have reached the limit of 3 endorsements per day' ||
        err.message === 'Portfolio not found'
      ) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Error endorsing skill:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/portfolio — Create or update a portfolio.
 * Requires a valid passkey. Enforces rate limiting and
 * brute-force lockout on repeated failed passkey attempts.
 */
router.put('/portfolio', protectedActionRateLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const ip = String(req.ip || 'unknown').trim();

    // 1. Validate credentials up front. Anything below this point
    //    trusts the username + passkey pair.
    const credentials = portfolioPutSchema.safeParse({
      username: body.username,
      passkey: body.passkey,
    });
    if (!credentials.success) {
      const firstIssue = credentials.error.issues[0];
      return res.status(400).json({ error: firstIssue?.message || 'Invalid request body' });
    }
    const { username, passkey } = credentials.data;

    // 2. Validate the content body. This rejects XSS payloads such
    //    as javascript: URLs and unknown protocol schemes before
    //    the data ever reaches the repository. The repository
    //    re-sanitizes as defense-in-depth.
    const content = portfolioContentSchema.safeParse(body);
    if (!content.success) {
      const firstIssue = content.error.issues[0];
      return res.status(400).json({
        error:
          `Invalid portfolio content: ${firstIssue?.path?.join('.') || ''} ${firstIssue?.message || ''}`.trim(),
      });
    }

    const existingPortfolio = await portfolioRepository.getByUsername(username);
    const isNewRegistration = !existingPortfolio;

    const lockout = checkPasskeyLockout(username, ip);
    if (lockout) {
      return res.status(429).json({
        error: 'Too many failed passkey attempts. Please try again later.',
      });
    }

    const isAuthorized = await portfolioRepository.verifyPasskey(username, passkey, {
      allowNew: isNewRegistration,
    });
    if (!isAuthorized) {
      recordFailedPasskeyAttempt(username, ip);
      return res.status(401).json({ error: 'Incorrect passkey for this username' });
    }

    clearPasskeyAttempts(username, ip);

    const saved = await portfolioRepository.createOrUpdate({
      ...content.data,
      username,
      passkey,
    });

    // If projects are saved, push real-time project approval notification
    if (saved && Array.isArray(saved.projects) && saved.projects.length > 0) {
      try {
        const { emitToRoom } = await import('../config/socket.js');
        const lastProject = saved.projects[saved.projects.length - 1];
        emitToRoom(`user-${String(username).toLowerCase()}`, 'project-approved', {
          projectName: lastProject.name,
        });
      } catch (socketErr) {
        console.warn('[Portfolio] Could not emit project-approved notification:', socketErr.message);
      }
    }

    return res.json({ ok: true, portfolio: saved });
  } catch (err) {
    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'Username already exists. Another request may have just created it.' });
    }
    console.error('Error saving portfolio:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
