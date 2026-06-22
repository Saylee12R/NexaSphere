import { Router } from 'express';
import { webhookService, WEBHOOK_EVENTS } from '../services/webhookService.js';
import { auth } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/events', auth('admin'), async (req, res) => {
  try {
    res.json({ success: true, data: WEBHOOK_EVENTS });
  } catch (error) {
    logger.error('Error fetching webhook events', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', auth('admin'), async (req, res) => {
  try {
    const webhook = await webhookService.createWebhook(req.body, req.user);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    const status = error.message.includes('HTTPS') || error.message.includes('event') ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.get('/', auth('admin'), async (req, res) => {
  try {
    const webhooks = await webhookService.listWebhooks();
    res.json({ success: true, data: webhooks });
  } catch (error) {
    logger.error('Error fetching webhooks', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:webhookId', auth('admin'), async (req, res) => {
  try {
    const webhook = await webhookService.getWebhookById(req.params.webhookId);
    res.json({ success: true, data: webhook });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.put('/:webhookId', auth('admin'), async (req, res) => {
  try {
    const webhook = await webhookService.updateWebhook(req.params.webhookId, req.body, req.user);
    res.json({ success: true, data: webhook });
  } catch (error) {
    const status = error.message.includes('not found')
      ? 404
      : error.message.includes('HTTPS')
        ? 400
        : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.delete('/:webhookId', auth('admin'), async (req, res) => {
  try {
    await webhookService.deleteWebhook(req.params.webhookId);
    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.post('/:webhookId/test', auth('admin'), async (req, res) => {
  try {
    const result = await webhookService.testWebhook(req.params.webhookId);
    res.json({ success: true, data: result });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.get('/:webhookId/deliveries', auth('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const deliveries = await webhookService.getWebhookDeliveries(req.params.webhookId, {
      limit,
      offset,
    });
    res.json({ success: true, data: deliveries });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.get('/:webhookId/stats', auth('admin'), async (req, res) => {
  try {
    const stats = await webhookService.getDeliveryStats(req.params.webhookId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/deliveries/:deliveryId/replay', auth('admin'), async (req, res) => {
  try {
    const result = await webhookService.replayDelivery(req.params.deliveryId);
    res.json({ success: true, data: result });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
