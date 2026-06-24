/**
 * Form Submission Routes
 * Handles public form submissions for membership, recruitment,
 * and core team applications with rate limiting.
 */

import { Router } from 'express';
import * as formsController from '../controllers/formsController.js';
import { formRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/forms/membership', formRateLimiter, formsController.makeHandleForm('membership'));
router.post('/forms/recruitment', formRateLimiter, formsController.makeHandleForm('recruitment'));
router.post('/core-team/apply', formRateLimiter, formsController.makeHandleForm('core_team'));

router.post(
  '/submissions/membership',
  formRateLimiter,
  formsController.makeHandleForm('membership')
);
router.post(
  '/submissions/recruitment',
  formRateLimiter,
  formsController.makeHandleForm('recruitment')
);

export default router;
