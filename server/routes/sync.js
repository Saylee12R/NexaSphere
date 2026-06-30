import { Router } from 'express';
import { syncController } from '../controllers/syncController.js';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import { syncRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/api/sync/status', requireStudentAuth, syncController.getSyncStatus);
router.get('/api/sync/updates', requireStudentAuth, syncController.getUpdates);
router.post('/api/sync/batch', requireStudentAuth, syncRateLimiter, syncController.syncBatch);
router.post(
  '/api/sync/resolve-conflicts',
  requireStudentAuth,
  syncRateLimiter,
  syncController.resolveConflicts
);

export default router;
