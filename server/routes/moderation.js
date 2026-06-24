import { Router } from 'express';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import * as moderationController from '../controllers/moderationController.js';

const router = Router();

// Public endpoint for submitting reports
router.post('/reports', moderationController.createFlag);

// All other moderation routes require student auth
router.use(requireStudentAuth);

// Flagged Content
router.get('/moderation/flags', moderationController.getFlags);
router.get('/moderation/flags/:id', moderationController.getFlagById);
router.put('/moderation/flags/:id/resolve', moderationController.resolveFlag);
router.put('/moderation/flags/:id/approve', moderationController.approveFlag);
router.put('/moderation/flags/:id/remove', moderationController.removeFlaggedContent);
router.put('/moderation/flags/:id/escalate', moderationController.escalateFlag);
router.delete('/moderation/flags/:id', moderationController.deleteFlag);

// User Warnings
router.post('/moderation/users/:userId/warn', moderationController.warnUser);
router.get('/moderation/users/:userId/warnings', moderationController.getUserWarnings);
router.get('/moderation/users/:userId/history', moderationController.getUserContentHistory);
router.post('/moderation/users/:userId/approve-all', moderationController.approveAllFromUser);

// Moderator Notes
router.post('/moderation/notes', moderationController.addModeratorNote);
router.get('/moderation/notes', moderationController.getModeratorNotes);

// Appeals
router.post('/moderation/appeals', moderationController.submitAppeal);
router.get('/moderation/appeals', moderationController.getAppeals);
router.put('/moderation/appeals/:id/review', moderationController.reviewAppeal);

// Analytics
router.get('/moderation/stats', moderationController.getFlagStats);
router.get('/moderation/stats/by-type', moderationController.getFlagStatsByType);
router.get('/moderation/stats/volume', moderationController.getFlagVolumeOverTime);
router.get('/moderation/stats/top-violators', moderationController.getTopViolatingUsers);
router.get('/moderation/stats/workload', moderationController.getModeratorWorkload);

// Bulk Actions
router.post('/moderation/bulk-resolve', moderationController.bulkResolve);

export default router;
