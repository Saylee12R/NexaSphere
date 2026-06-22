import { emailCampaignService } from '../services/emailCampaignService.js';

function wrapAsync(fn) {
  return (req, res) =>
    Promise.resolve(fn(req, res)).catch((e) => {
      let status = 500;
      const msg = e.message || '';

      if (msg.includes('Forbidden') || msg.includes('permission')) {
        status = 403;
      } else if (msg.includes('Authentication') || msg.includes('authorized')) {
        status = 401;
      } else if (msg.includes('not found') || msg.includes('Not found')) {
        status = 404;
      } else if (msg.includes('invalid') || msg.includes('required') || msg.includes('Cannot')) {
        status = 400;
      }

      res.status(status).json({ error: msg || 'Internal server error' });
    });
}

// --- Campaigns ---
export const createCampaign = wrapAsync(async (req, res) => {
  const { name, subject, templateName, content, segmentCriteria, scheduledAt } = req.body;
  if (!name || !subject) {
    return res.status(400).json({ error: 'Campaign name and subject are required' });
  }

  const campaign = await emailCampaignService.createCampaign(
    { name, subject, templateName, content, segmentCriteria, scheduledAt },
    req.studentUser
  );
  return res.status(201).json(campaign);
});

export const getCampaigns = wrapAsync(async (req, res) => {
  const { status, limit } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (limit) filters.limit = parseInt(limit, 10);

  const campaigns = await emailCampaignService.getCampaigns(filters);
  return res.status(200).json({ campaigns });
});

export const getCampaignById = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const campaign = await emailCampaignService.getCampaignById(id);
  return res.status(200).json(campaign);
});

export const updateCampaign = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await emailCampaignService.updateCampaign(id, req.body);
  return res.status(200).json(updated);
});

export const deleteCampaign = wrapAsync(async (req, res) => {
  const { id } = req.params;
  await emailCampaignService.deleteCampaign(id);
  return res.status(200).json({ success: true });
});

export const sendCampaign = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const result = await emailCampaignService.sendCampaign(id, req.studentUser);
  return res.status(200).json(result);
});

export const getCampaignStats = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const stats = await emailCampaignService.getCampaignStats(id);
  return res.status(200).json(stats);
});

export const getCampaignAnalytics = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const analytics = await emailCampaignService.getCampaignAnalytics(id);
  return res.status(200).json({ analytics });
});

export const trackOpen = wrapAsync(async (req, res) => {
  const { campaignId, email } = req.query;
  if (!campaignId || !email) {
    return res.status(400).json({ error: 'campaignId and email are required' });
  }
  await emailCampaignService.trackOpen(campaignId, email);
  // Return a 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).send(pixel);
});

export const trackClick = wrapAsync(async (req, res) => {
  const { campaignId, email, url } = req.query;
  if (!campaignId || !email) {
    return res.status(400).json({ error: 'campaignId and email are required' });
  }
  await emailCampaignService.trackClick(campaignId, email);
  return res.redirect(url || '/');
});

// --- Templates ---
export const createTemplate = wrapAsync(async (req, res) => {
  const { name, subject, htmlContent, category } = req.body;
  if (!name || !htmlContent) {
    return res.status(400).json({ error: 'Template name and HTML content are required' });
  }

  const template = await emailCampaignService.createTemplate(
    { name, subject, htmlContent, category },
    req.studentUser
  );
  return res.status(201).json(template);
});

export const getTemplates = wrapAsync(async (req, res) => {
  const { category } = req.query;
  const templates = await emailCampaignService.getTemplates(category || null);
  return res.status(200).json({ templates });
});

export const getTemplateById = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const template = await emailCampaignService.getTemplateById(id);
  return res.status(200).json(template);
});

export const updateTemplate = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await emailCampaignService.updateTemplate(id, req.body);
  return res.status(200).json(updated);
});

export const deleteTemplate = wrapAsync(async (req, res) => {
  const { id } = req.params;
  await emailCampaignService.deleteTemplate(id);
  return res.status(200).json({ success: true });
});

// --- Unsubscribe ---
export const unsubscribe = wrapAsync(async (req, res) => {
  const { email, reason } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  await emailCampaignService.unsubscribe(email, reason);
  return res.status(200).json({ success: true, message: 'You have been unsubscribed' });
});

export const resubscribe = wrapAsync(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  await emailCampaignService.resubscribe(email);
  return res.status(200).json({ success: true, message: 'You have been resubscribed' });
});

export const checkUnsubscribed = wrapAsync(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const isUnsubscribed = await emailCampaignService.checkUnsubscribed(email);
  return res.status(200).json({ isUnsubscribed });
});

// --- Automation Triggers ---
export const createTrigger = wrapAsync(async (req, res) => {
  const { name, triggerType, campaignId, conditions, isActive } = req.body;
  if (!name || !triggerType) {
    return res.status(400).json({ error: 'Trigger name and type are required' });
  }

  const trigger = await emailCampaignService.createTrigger(
    { name, triggerType, campaignId, conditions, isActive },
    req.studentUser
  );
  return res.status(201).json(trigger);
});

export const getTriggers = wrapAsync(async (req, res) => {
  const triggers = await emailCampaignService.getTriggers();
  return res.status(200).json({ triggers });
});

export const updateTrigger = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await emailCampaignService.updateTrigger(id, req.body);
  return res.status(200).json(updated);
});

export const deleteTrigger = wrapAsync(async (req, res) => {
  const { id } = req.params;
  await emailCampaignService.deleteTrigger(id);
  return res.status(200).json({ success: true });
});
