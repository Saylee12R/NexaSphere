import express from 'express';
import {
  getUserLifecycle,
  updateEventAttended,
  getLifecycleAnalytics,
} from '../controllers/lifecycleController.js';

const router = express.Router();

router.get('/analytics', getLifecycleAnalytics);
router.get('/:userId', getUserLifecycle);
router.post('/attend', updateEventAttended);

export default router;
