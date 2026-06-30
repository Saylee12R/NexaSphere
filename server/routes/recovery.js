import { Router } from 'express';
import { recoveryController } from '../controllers/recoveryController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { adminAuditMiddleware } from '../middleware/adminAuditMiddleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/authRateLimiter.js';

const router = Router();

// ── Admin Recovery Routes ────────────────────────────────────────────────────
router.post(
  '/admin/users/:id/unlock',
  adminAuthMiddleware.requireAdmin,
  adminAuditMiddleware,
  recoveryController.unlockAccount
);

router.post(
  '/admin/users/:id/reset-password',
  adminAuthMiddleware.requireAdmin,
  adminAuditMiddleware,
  recoveryController.resetPasswordAsAdmin
);

router.delete(
  '/admin/portfolios/:username',
  adminAuthMiddleware.requireAdmin,
  adminAuditMiddleware,
  recoveryController.deletePortfolio
);

router.post(
  '/admin/portfolios/:username/recover',
  adminAuthMiddleware.requireAdmin,
  adminAuditMiddleware,
  recoveryController.recoverPortfolio
);

// ── Public Auth Recovery Routes ──────────────────────────────────────────────
router.post('/auth/forgot-password', passwordResetRateLimiter, recoveryController.forgotPassword);

router.post(
  '/auth/reset-password',
  passwordResetRateLimiter,
  recoveryController.resetPasswordWithToken
);

export default router;
