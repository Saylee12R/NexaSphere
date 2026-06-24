import express from 'express';
import {
  submitFeedback,
  getFeedbackAnalytics,
  getFeedbacks,
  createActionItem,
  getActionItems,
} from '../controllers/feedbackController.js';

const router = express.Router();

router.post('/', submitFeedback);
router.get('/analytics/:eventId', getFeedbackAnalytics);
router.get('/:eventId', getFeedbacks);

router.post('/actions', createActionItem);
router.get('/actions/:eventId', getActionItems);

export default router;
