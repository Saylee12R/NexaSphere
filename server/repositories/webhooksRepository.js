import { withDb } from './db.js';

function mapWebhookRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    secret: row.secret,
    events: row.events || [],
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeliveryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    webhookId: row.webhook_id,
    eventType: row.event_type,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload ?? {}),
    deliveryId: row.delivery_id,
    status: row.status,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    errorMessage: row.error_message,
    attemptCount: row.attempt_count,
    nextRetryAt: row.next_retry_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  };
}

export const webhooksRepository = {
  async create(webhook) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO webhooks (name, url, secret, events, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          webhook.name,
          webhook.url,
          webhook.secret,
          webhook.events || [],
          webhook.isActive !== false,
          webhook.createdBy,
        ]
      );
      return mapWebhookRow(rows[0]);
    });
  },

  async getById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM webhooks WHERE id = $1', [id]);
      return rows.length ? mapWebhookRow(rows[0]) : null;
    });
  },

  async listAll() {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM webhooks ORDER BY created_at DESC');
      return rows.map(mapWebhookRow);
    });
  },

  async listActiveByEvent(eventType) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM webhooks WHERE is_active = true AND $1 = ANY(events)',
        [eventType]
      );
      return rows.map(mapWebhookRow);
    });
  },

  async update(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE webhooks SET
           name = COALESCE($2, name),
           url = COALESCE($3, url),
           secret = COALESCE($4, secret),
           events = COALESCE($5, events),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          id,
          patch.name ?? null,
          patch.url ?? null,
          patch.secret ?? null,
          patch.events ?? null,
          patch.isActive !== undefined ? patch.isActive : null,
        ]
      );
      return rows.length ? mapWebhookRow(rows[0]) : null;
    });
  },

  async delete(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM webhooks WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },

  async createDelivery(delivery) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, delivery_id, status, attempt_count)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          delivery.webhookId,
          delivery.eventType,
          JSON.stringify(delivery.payload),
          delivery.deliveryId,
          delivery.status || 'pending',
          delivery.attemptCount || 0,
        ]
      );
      return mapDeliveryRow(rows[0]);
    });
  },

  async getDeliveryById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM webhook_deliveries WHERE id = $1', [id]);
      return rows.length ? mapDeliveryRow(rows[0]) : null;
    });
  },

  async getDeliveryByDeliveryId(deliveryId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM webhook_deliveries WHERE delivery_id = $1',
        [deliveryId]
      );
      return rows.length ? mapDeliveryRow(rows[0]) : null;
    });
  },

  async getDeliveriesByWebhookId(webhookId, { limit = 50, offset = 0 } = {}) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [webhookId, limit, offset]
      );
      return rows.map(mapDeliveryRow);
    });
  },

  async listPendingRetries() {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT wd.* FROM webhook_deliveries wd
         JOIN webhooks w ON w.id = wd.webhook_id
         WHERE wd.status = 'pending' AND wd.next_retry_at <= NOW() AND w.is_active = true
         ORDER BY wd.next_retry_at ASC LIMIT 100`
      );
      return rows.map(mapDeliveryRow);
    });
  },

  async updateDelivery(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE webhook_deliveries SET
           status = COALESCE($2, status),
           response_status = COALESCE($3, response_status),
           response_body = COALESCE($4, response_body),
           error_message = COALESCE($5, error_message),
           attempt_count = COALESCE($6, attempt_count),
           next_retry_at = $7,
           delivered_at = $8
         WHERE id = $1 RETURNING *`,
        [
          id,
          patch.status ?? null,
          patch.responseStatus ?? null,
          patch.responseBody ?? null,
          patch.errorMessage ?? null,
          patch.attemptCount ?? null,
          patch.nextRetryAt || null,
          patch.deliveredAt || null,
        ]
      );
      return rows.length ? mapDeliveryRow(rows[0]) : null;
    });
  },

  async getDeliveryStats(webhookId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT
           status,
           COUNT(*) as count
         FROM webhook_deliveries
         WHERE webhook_id = $1
         GROUP BY status`,
        [webhookId]
      );
      const stats = { success: 0, failed: 0, pending: 0 };
      rows.forEach((row) => {
        stats[row.status] = parseInt(row.count, 10);
      });
      return stats;
    });
  },

  async deleteDeliveriesByWebhookId(webhookId) {
    return withDb(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM webhook_deliveries WHERE webhook_id = $1',
        [webhookId]
      );
      return rowCount > 0;
    });
  },
};
