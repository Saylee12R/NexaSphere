import { withDb } from './db.js';

function mapCampaignRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    templateName: row.template_name,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : (row.content ?? {}),
    segmentCriteria:
      typeof row.segment_criteria === 'string'
        ? JSON.parse(row.segment_criteria)
        : (row.segment_criteria ?? {}),
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCampaignAnalyticsRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    status: row.status,
    openedAt: row.opened_at,
    clickedAt: row.clicked_at,
    unsubscribedAt: row.unsubscribed_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

function mapEmailTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    htmlContent: row.html_content,
    category: row.category,
    isDefault: row.is_default,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUnsubscribeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export const emailCampaignRepository = {
  // --- Campaigns ---
  async createCampaign(campaign) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO email_campaigns (name, subject, template_name, content, segment_criteria, status, scheduled_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          campaign.name,
          campaign.subject,
          campaign.templateName || null,
          JSON.stringify(campaign.content || {}),
          JSON.stringify(campaign.segmentCriteria || {}),
          campaign.status || 'draft',
          campaign.scheduledAt || null,
          campaign.createdBy,
        ]
      );
      return mapCampaignRow(rows[0]);
    });
  },

  async getCampaignById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
      if (!rows.length) return null;
      return mapCampaignRow(rows[0]);
    });
  },

  async getCampaigns(filters = {}) {
    return withDb(async (client) => {
      let query = 'SELECT * FROM email_campaigns';
      const params = [];
      const conditions = [];

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (conditions.length) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }

      const { rows } = await client.query(query, params);
      return rows.map(mapCampaignRow);
    });
  },

  async updateCampaign(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE email_campaigns SET
           name = COALESCE($2, name),
           subject = COALESCE($3, subject),
           template_name = COALESCE($4, template_name),
           content = COALESCE($5, content),
           segment_criteria = COALESCE($6, segment_criteria),
           status = COALESCE($7, status),
           scheduled_at = COALESCE($8, scheduled_at),
           sent_at = COALESCE($9, sent_at),
           updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          patch.name ?? null,
          patch.subject ?? null,
          patch.templateName ?? null,
          patch.content ? JSON.stringify(patch.content) : null,
          patch.segmentCriteria ? JSON.stringify(patch.segmentCriteria) : null,
          patch.status ?? null,
          patch.scheduledAt ?? null,
          patch.sentAt ?? null,
        ]
      );
      if (!rows.length) return null;
      return mapCampaignRow(rows[0]);
    });
  },

  async deleteCampaign(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM email_campaigns WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },

  // --- Campaign Analytics ---
  async insertCampaignAnalytics(analytics) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO email_campaign_analytics (campaign_id, recipient_email, recipient_name, status, sent_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          analytics.campaignId,
          analytics.recipientEmail,
          analytics.recipientName || null,
          analytics.status || 'sent',
          analytics.sentAt || new Date(),
        ]
      );
      return mapCampaignAnalyticsRow(rows[0]);
    });
  },

  async getCampaignAnalytics(campaignId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM email_campaign_analytics WHERE campaign_id = $1 ORDER BY created_at DESC',
        [campaignId]
      );
      return rows.map(mapCampaignAnalyticsRow);
    });
  },

  async getCampaignStats(campaignId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT
           COUNT(*) as total_sent,
           COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
           COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as total_clicked,
           COUNT(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 END) as total_unsubscribed
         FROM email_campaign_analytics
         WHERE campaign_id = $1`,
        [campaignId]
      );
      const stats = rows[0];
      return {
        totalSent: parseInt(stats.total_sent, 10),
        totalOpened: parseInt(stats.total_opened, 10),
        totalClicked: parseInt(stats.total_clicked, 10),
        totalUnsubscribed: parseInt(stats.total_unsubscribed, 10),
        openRate:
          parseInt(stats.total_sent, 10) > 0
            ? Math.round((parseInt(stats.total_opened, 10) / parseInt(stats.total_sent, 10)) * 100)
            : 0,
        clickRate:
          parseInt(stats.total_sent, 10) > 0
            ? Math.round((parseInt(stats.total_clicked, 10) / parseInt(stats.total_sent, 10)) * 100)
            : 0,
      };
    });
  },

  async markOpened(campaignId, recipientEmail) {
    return withDb(async (client) => {
      await client.query(
        `UPDATE email_campaign_analytics
         SET opened_at = NOW()
         WHERE campaign_id = $1 AND recipient_email = $2 AND opened_at IS NULL`,
        [campaignId, recipientEmail]
      );
    });
  },

  async markClicked(campaignId, recipientEmail) {
    return withDb(async (client) => {
      await client.query(
        `UPDATE email_campaign_analytics
         SET clicked_at = NOW()
         WHERE campaign_id = $1 AND recipient_email = $2 AND clicked_at IS NULL`,
        [campaignId, recipientEmail]
      );
    });
  },

  // --- Email Templates ---
  async createEmailTemplate(template) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO email_templates (name, subject, html_content, category, is_default, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          template.name,
          template.subject,
          template.htmlContent,
          template.category || 'general',
          template.isDefault || false,
          template.createdBy,
        ]
      );
      return mapEmailTemplateRow(rows[0]);
    });
  },

  async getEmailTemplateById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM email_templates WHERE id = $1', [id]);
      if (!rows.length) return null;
      return mapEmailTemplateRow(rows[0]);
    });
  },

  async getEmailTemplates(category = null) {
    return withDb(async (client) => {
      let query = 'SELECT * FROM email_templates';
      const params = [];
      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }
      query += ' ORDER BY created_at DESC';
      const { rows } = await client.query(query, params);
      return rows.map(mapEmailTemplateRow);
    });
  },

  async updateEmailTemplate(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE email_templates SET
           name = COALESCE($2, name),
           subject = COALESCE($3, subject),
           html_content = COALESCE($4, html_content),
           category = COALESCE($5, category),
           updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          patch.name ?? null,
          patch.subject ?? null,
          patch.htmlContent ?? null,
          patch.category ?? null,
        ]
      );
      if (!rows.length) return null;
      return mapEmailTemplateRow(rows[0]);
    });
  },

  async deleteEmailTemplate(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM email_templates WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },

  // --- Unsubscribe Management ---
  async addUnsubscribe(email, reason = null) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO email_unsubscribes (email, reason)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET reason = $2
         RETURNING *`,
        [email, reason]
      );
      return mapUnsubscribeRow(rows[0]);
    });
  },

  async isUnsubscribed(email) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT id FROM email_unsubscribes WHERE email = $1', [
        email,
      ]);
      return rows.length > 0;
    });
  },

  async removeUnsubscribe(email) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM email_unsubscribes WHERE email = $1', [
        email,
      ]);
      return rowCount > 0;
    });
  },

  // --- Segmentation ---
  async getSegmentUsers(criteria) {
    return withDb(async (client) => {
      let query = 'SELECT id, email, full_name FROM student_users WHERE 1=1';
      const params = [];

      if (criteria.activityLevel) {
        query += ` AND activity_level = $${params.length + 1}`;
        params.push(criteria.activityLevel);
      }

      if (criteria.graduationYear) {
        query += ` AND graduation_year = $${params.length + 1}`;
        params.push(criteria.graduationYear);
      }

      if (criteria.interests && criteria.interests.length > 0) {
        query += ` AND interests && $${params.length + 1}`;
        params.push(criteria.interests);
      }

      if (criteria.excludeUnsubscribed) {
        query += ` AND email NOT IN (SELECT email FROM email_unsubscribes)`;
      }

      const { rows } = await client.query(query, params);
      return rows;
    });
  },

  // --- Automation Triggers ---
  async createAutomationTrigger(trigger) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO email_automation_triggers (name, trigger_type, campaign_id, conditions, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          trigger.name,
          trigger.triggerType,
          trigger.campaignId || null,
          JSON.stringify(trigger.conditions || {}),
          trigger.isActive !== false,
          trigger.createdBy,
        ]
      );
      return rows[0];
    });
  },

  async getAutomationTriggers() {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM email_automation_triggers ORDER BY created_at DESC'
      );
      return rows;
    });
  },

  async updateAutomationTrigger(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE email_automation_triggers SET
           name = COALESCE($2, name),
           is_active = COALESCE($3, is_active),
           conditions = COALESCE($4, conditions),
           updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          patch.name ?? null,
          patch.isActive !== undefined ? patch.isActive : null,
          patch.conditions ? JSON.stringify(patch.conditions) : null,
        ]
      );
      if (!rows.length) return null;
      return rows[0];
    });
  },

  async deleteAutomationTrigger(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM email_automation_triggers WHERE id = $1',
        [id]
      );
      return rowCount > 0;
    });
  },

  async getActiveTriggersByType(triggerType) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM email_automation_triggers WHERE trigger_type = $1 AND is_active = true',
        [triggerType]
      );
      return rows;
    });
  },
};
