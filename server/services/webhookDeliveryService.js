import crypto from 'crypto';
import { webhooksRepository } from '../repositories/webhooksRepository.js';
import logger from '../utils/logger.js';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 5000;
const HTTP_TIMEOUT_MS = 10000;

function generateHmacSignature(secret, payload) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function calculateRetryDelay(attemptCount) {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attemptCount);
}

export const webhookDeliveryService = {
  async deliverPayload(webhook, eventType, payload) {
    const deliveryId = crypto.randomUUID();
    const signature = generateHmacSignature(webhook.secret, payload);

    const delivery = await webhooksRepository.createDelivery({
      webhookId: webhook.id,
      eventType,
      payload,
      deliveryId,
      status: 'pending',
      attemptCount: 0,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Delivery-ID': deliveryId,
          'X-Webhook-Event': eventType,
          'User-Agent': 'NexaSphere-Webhooks/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        await webhooksRepository.updateDelivery(delivery.id, {
          status: 'success',
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          deliveredAt: new Date(),
        });
        logger.info('Webhook delivered successfully', {
          webhookId: webhook.id,
          deliveryId,
          eventType,
        });
        return { success: true, deliveryId };
      }

      const nextRetryAt = this.calculateNextRetryTime(0);
      await webhooksRepository.updateDelivery(delivery.id, {
        status: 'pending',
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000),
        attemptCount: 1,
        nextRetryAt,
      });
      logger.warn('Webhook delivery failed, scheduling retry', {
        webhookId: webhook.id,
        deliveryId,
        status: response.status,
      });
      return { success: false, deliveryId, error: `HTTP ${response.status}` };
    } catch (error) {
      const nextRetryAt = this.calculateNextRetryTime(0);
      await webhooksRepository.updateDelivery(delivery.id, {
        status: 'pending',
        errorMessage: error.message,
        attemptCount: 1,
        nextRetryAt,
      });
      logger.error('Webhook delivery error', {
        webhookId: webhook.id,
        deliveryId,
        error: error.message,
      });
      return { success: false, deliveryId, error: error.message };
    }
  },

  async retryDelivery(deliveryId) {
    const delivery = await webhooksRepository.getDeliveryById(deliveryId);
    if (!delivery) throw new Error('Delivery not found');
    if (delivery.status === 'success') throw new Error('Delivery already succeeded');

    const webhook = await webhooksRepository.getById(delivery.webhookId);
    if (!webhook || !webhook.isActive) throw new Error('Webhook not found or inactive');

    const signature = generateHmacSignature(webhook.secret, delivery.payload);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Delivery-ID': delivery.deliveryId,
          'X-Webhook-Event': delivery.eventType,
          'User-Agent': 'NexaSphere-Webhooks/1.0',
        },
        body: JSON.stringify(delivery.payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');
      const newAttemptCount = delivery.attemptCount + 1;

      if (response.ok) {
        await webhooksRepository.updateDelivery(delivery.id, {
          status: 'success',
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          attemptCount: newAttemptCount,
          deliveredAt: new Date(),
          nextRetryAt: null,
        });
        logger.info('Webhook retry successful', {
          webhookId: webhook.id,
          deliveryId: delivery.deliveryId,
        });
        return { success: true };
      }

      if (newAttemptCount >= MAX_RETRIES) {
        await webhooksRepository.updateDelivery(delivery.id, {
          status: 'failed',
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          attemptCount: newAttemptCount,
          nextRetryAt: null,
        });
        logger.error('Webhook delivery permanently failed after max retries', {
          webhookId: webhook.id,
          deliveryId: delivery.deliveryId,
        });
        return { success: false, error: 'Max retries exceeded' };
      }

      const nextRetryAt = this.calculateNextRetryTime(newAttemptCount);
      await webhooksRepository.updateDelivery(delivery.id, {
        status: 'pending',
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000),
        attemptCount: newAttemptCount,
        nextRetryAt,
      });
      return { success: false, error: `HTTP ${response.status}, retry scheduled` };
    } catch (error) {
      const newAttemptCount = delivery.attemptCount + 1;
      if (newAttemptCount >= MAX_RETRIES) {
        await webhooksRepository.updateDelivery(delivery.id, {
          status: 'failed',
          errorMessage: error.message,
          attemptCount: newAttemptCount,
          nextRetryAt: null,
        });
        return { success: false, error: 'Max retries exceeded' };
      }
      const nextRetryAt = this.calculateNextRetryTime(newAttemptCount);
      await webhooksRepository.updateDelivery(delivery.id, {
        status: 'pending',
        errorMessage: error.message,
        attemptCount: newAttemptCount,
        nextRetryAt,
      });
      return { success: false, error: error.message };
    }
  },

  calculateNextRetryTime(attemptCount) {
    const delay = calculateRetryDelay(attemptCount);
    return new Date(Date.now() + delay);
  },

  async processPendingRetries() {
    const pendingDeliveries = await webhooksRepository.listPendingRetries();
    const results = [];
    for (const delivery of pendingDeliveries) {
      const result = await this.retryDelivery(delivery.id);
      results.push({ deliveryId: delivery.deliveryId, ...result });
    }
    return results;
  },

  verifySignature(secret, payload, signature) {
    const expectedSignature = generateHmacSignature(secret, payload);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  },
};
