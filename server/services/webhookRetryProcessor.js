import { webhookDeliveryService } from '../services/webhookDeliveryService.js';
import logger from '../utils/logger.js';

const RETRY_INTERVAL_MS = 60000;
let retryInterval = null;

export function startWebhookRetryProcessor() {
  if (retryInterval) return;
  retryInterval = setInterval(async () => {
    try {
      const results = await webhookDeliveryService.processPendingRetries();
      if (results.length > 0) {
        logger.info('Webhook retry batch completed', { processed: results.length });
      }
    } catch (error) {
      logger.error('Webhook retry processor error', { error: error.message });
    }
  }, RETRY_INTERVAL_MS);
  logger.info('Webhook retry processor started', { intervalMs: RETRY_INTERVAL_MS });
}

export function stopWebhookRetryProcessor() {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
    logger.info('Webhook retry processor stopped');
  }
}
