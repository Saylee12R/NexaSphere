import { withDb } from './db.js';

function mapFlagRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    contentPreview: row.content_preview,
    userId: row.user_id,
    reportedBy: row.reported_by,
    flagType: row.flag_type,
    reason: row.reason,
    severity: row.severity,
    status: row.status,
    moderatorId: row.moderator_id,
    resolution: row.resolution,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function mapUserWarningRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    warningLevel: row.warning_level,
    reason: row.reason,
    issuedBy: row.issued_by,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function mapModeratorNoteRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapAppealRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    flagId: row.flag_id,
    userId: row.user_id,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by,
    decision: row.decision,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export const moderationRepository = {
  // --- Flagged Content ---
  async createFlag(flag) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO moderation_flags (content_type, content_id, content_preview, user_id, reported_by, flag_type, reason, severity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          flag.contentType,
          flag.contentId,
          flag.contentPreview,
          flag.userId,
          flag.reportedBy || null,
          flag.flagType,
          flag.reason || null,
          flag.severity || 'medium',
          flag.status || 'pending',
        ]
      );
      return mapFlagRow(rows[0]);
    });
  },

  async getFlagById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM moderation_flags WHERE id = $1', [id]);
      if (!rows.length) return null;
      return mapFlagRow(rows[0]);
    });
  },

  async getFlags(filters = {}) {
    return withDb(async (client) => {
      let query = 'SELECT * FROM moderation_flags';
      const params = [];
      const conditions = [];

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters.flagType) {
        conditions.push(`flag_type = $${params.length + 1}`);
        params.push(filters.flagType);
      }

      if (filters.severity) {
        conditions.push(`severity = $${params.length + 1}`);
        params.push(filters.severity);
      }

      if (filters.contentType) {
        conditions.push(`content_type = $${params.length + 1}`);
        params.push(filters.contentType);
      }

      if (filters.userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(filters.userId);
      }

      if (conditions.length) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(filters.offset);
      }

      const { rows } = await client.query(query, params);
      return rows.map(mapFlagRow);
    });
  },

  async updateFlag(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE moderation_flags SET
           status = COALESCE($2, status),
           moderator_id = COALESCE($3, moderator_id),
           resolution = COALESCE($4, resolution),
           resolution_note = COALESCE($5, resolution_note),
           resolved_at = COALESCE($6, resolved_at)
         WHERE id = $1
         RETURNING *`,
        [
          id,
          patch.status ?? null,
          patch.moderatorId ?? null,
          patch.resolution ?? null,
          patch.resolutionNote ?? null,
          patch.resolvedAt ?? null,
        ]
      );
      if (!rows.length) return null;
      return mapFlagRow(rows[0]);
    });
  },

  async deleteFlag(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM moderation_flags WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },

  async getFlagStats() {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
           COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
           COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated,
           COUNT(CASE WHEN resolution = 'approved' THEN 1 END) as approved,
           COUNT(CASE WHEN resolution = 'removed' THEN 1 END) as removed,
           COUNT(CASE WHEN resolution = 'warned' THEN 1 END) as warned,
           COUNT(CASE WHEN resolution = 'banned' THEN 1 END) as banned
         FROM moderation_flags`
      );
      const stats = rows[0];
      return {
        total: parseInt(stats.total, 10),
        pending: parseInt(stats.pending, 10),
        reviewed: parseInt(stats.reviewed, 10),
        escalated: parseInt(stats.escalated, 10),
        approved: parseInt(stats.approved, 10),
        removed: parseInt(stats.removed, 10),
        warned: parseInt(stats.warned, 10),
        banned: parseInt(stats.banned, 10),
      };
    });
  },

  async getFlagStatsByType() {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT flag_type, COUNT(*) as count
         FROM moderation_flags
         WHERE status = 'pending'
         GROUP BY flag_type
         ORDER BY count DESC`
      );
      return rows.map((r) => ({ type: r.flag_type, count: parseInt(r.count, 10) }));
    });
  },

  // --- User Warnings ---
  async createUserWarning(warning) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO moderation_user_warnings (user_id, warning_level, reason, issued_by, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          warning.userId,
          warning.warningLevel,
          warning.reason,
          warning.issuedBy,
          warning.expiresAt || null,
        ]
      );
      return mapUserWarningRow(rows[0]);
    });
  },

  async getUserWarnings(userId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM moderation_user_warnings WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return rows.map(mapUserWarningRow);
    });
  },

  async getActiveUserWarning(userId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM moderation_user_warnings
         WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY warning_level DESC
         LIMIT 1`,
        [userId]
      );
      if (!rows.length) return null;
      return mapUserWarningRow(rows[0]);
    });
  },

  async deleteUserWarning(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM moderation_user_warnings WHERE id = $1',
        [id]
      );
      return rowCount > 0;
    });
  },

  // --- Moderator Notes ---
  async createModeratorNote(note) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO moderation_notes (target_type, target_id, note, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [note.targetType, note.targetId, note.note, note.createdBy]
      );
      return mapModeratorNoteRow(rows[0]);
    });
  },

  async getModeratorNotes(targetType, targetId) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM moderation_notes WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC',
        [targetType, targetId]
      );
      return rows.map(mapModeratorNoteRow);
    });
  },

  async deleteModeratorNote(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM moderation_notes WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },

  // --- Appeals ---
  async createAppeal(appeal) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO moderation_appeals (flag_id, user_id, reason, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [appeal.flagId, appeal.userId, appeal.reason, appeal.status || 'pending']
      );
      return mapAppealRow(rows[0]);
    });
  },

  async getAppealById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM moderation_appeals WHERE id = $1', [id]);
      if (!rows.length) return null;
      return mapAppealRow(rows[0]);
    });
  },

  async getAppeals(filters = {}) {
    return withDb(async (client) => {
      let query = 'SELECT * FROM moderation_appeals';
      const params = [];
      const conditions = [];

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters.userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(filters.userId);
      }

      if (conditions.length) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const { rows } = await client.query(query, params);
      return rows.map(mapAppealRow);
    });
  },

  async updateAppeal(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE moderation_appeals SET
           status = COALESCE($2, status),
           reviewed_by = COALESCE($3, reviewed_by),
           decision = COALESCE($4, decision),
           decision_note = COALESCE($5, decision_note),
           resolved_at = COALESCE($6, resolved_at)
         WHERE id = $1
         RETURNING *`,
        [
          id,
          patch.status ?? null,
          patch.reviewedBy ?? null,
          patch.decision ?? null,
          patch.decisionNote ?? null,
          patch.resolvedAt ?? null,
        ]
      );
      if (!rows.length) return null;
      return mapAppealRow(rows[0]);
    });
  },

  // --- User Content History ---
  async getUserContentHistory(userId, limit = 50) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM moderation_flags
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return rows.map(mapFlagRow);
    });
  },

  // --- Analytics ---
  async getFlagVolumeOverTime(days = 30) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM moderation_flags
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      );
      return rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
    });
  },

  async getTopViolatingUsers(limit = 10) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT user_id, COUNT(*) as violation_count
         FROM moderation_flags
         WHERE status = 'pending' OR resolution IN ('removed', 'warned', 'banned')
         GROUP BY user_id
         ORDER BY violation_count DESC
         LIMIT $1`,
        [limit]
      );
      return rows.map((r) => ({ userId: r.user_id, violations: parseInt(r.violation_count, 10) }));
    });
  },

  async getModeratorWorkload() {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT moderator_id, COUNT(*) as resolved_count
         FROM moderation_flags
         WHERE status = 'reviewed' AND moderator_id IS NOT NULL
         GROUP BY moderator_id
         ORDER BY resolved_count DESC`
      );
      return rows.map((r) => ({
        moderatorId: r.moderator_id,
        resolved: parseInt(r.resolved_count, 10),
      }));
    });
  },
};
