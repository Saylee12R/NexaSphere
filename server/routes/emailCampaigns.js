import { Router } from 'express';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import * as emailCampaignController from '../controllers/emailCampaignController.js';

const router = Router();

// Public tracking endpoints (no auth required)
router.get('/track/open', emailCampaignController.trackOpen);
router.get('/track/click', emailCampaignController.trackClick);
router.post('/unsubscribe', emailCampaignController.unsubscribe);
router.post('/resubscribe', emailCampaignController.resubscribe);
router.get('/unsubscribe/status', emailCampaignController.checkUnsubscribed);

// All other email campaign routes require student auth
router.use(requireStudentAuth);

// Campaigns
router.post('/campaigns', emailCampaignController.createCampaign);
router.get('/campaigns', emailCampaignController.getCampaigns);
router.get('/campaigns/:id', emailCampaignController.getCampaignById);
router.put('/campaigns/:id', emailCampaignController.updateCampaign);
router.delete('/campaigns/:id', emailCampaignController.deleteCampaign);
router.post('/campaigns/:id/send', emailCampaignController.sendCampaign);
router.get('/campaigns/:id/stats', emailCampaignController.getCampaignStats);
router.get('/campaigns/:id/analytics', emailCampaignController.getCampaignAnalytics);

// Email Templates
router.post('/email-templates', emailCampaignController.createTemplate);
router.get('/email-templates', emailCampaignController.getTemplates);
router.get('/email-templates/:id', emailCampaignController.getTemplateById);
router.put('/email-templates/:id', emailCampaignController.updateTemplate);
router.delete('/email-templates/:id', emailCampaignController.deleteTemplate);

// Automation Triggers
router.post('/automation-triggers', emailCampaignController.createTrigger);
router.get('/automation-triggers', emailCampaignController.getTriggers);
router.put('/automation-triggers/:id', emailCampaignController.updateTrigger);
router.delete('/automation-triggers/:id', emailCampaignController.deleteTrigger);

export default router;
