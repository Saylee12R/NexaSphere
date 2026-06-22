import express from 'express';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import { dashboardController } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/api/dashboard/stats', requireStudentAuth, dashboardController.getStats);

router.get('/api/dashboard/quests', requireStudentAuth, dashboardController.getQuests);

router.get('/api/dashboard/leaderboard', requireStudentAuth, dashboardController.getLeaderboard);

export default router;
