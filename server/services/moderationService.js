import { moderationRepository } from '../repositories/moderationRepository.js';

const WARNING_LEVELS = {
  FIRST: 1,
  SECOND: 2,
  TEMPORARY_BAN: 3,
  PERMANENT_BAN: 4,
};

export class ModerationService {
  // --- Flagged Content ---
  async createFlag(flagData) {
    const flag = await moderationRepository.createFlag(flagData);

    await moderationRepository.createModeratorNote({
      targetType: 'flag',
      targetId: flag.id,
      note: `Content flagged: ${flag.flagType} (${flag.severity})`,
      createdBy: flag.reportedBy || 'system',
    });

    return flag;
  }

  async getFlagById(id) {
    const flag = await moderationRepository.getFlagById(id);
    if (!flag) throw new Error('Flag not found');
    return flag;
  }

  async getFlags(filters = {}) {
    return moderationRepository.getFlags(filters);
  }

  async resolveFlag(id, resolution, moderatorId, note = null) {
    const flag = await moderationRepository.getFlagById(id);
    if (!flag) throw new Error('Flag not found');

    const updated = await moderationRepository.updateFlag(id, {
      status: 'reviewed',
      moderatorId,
      resolution,
      resolutionNote: note,
      resolvedAt: new Date(),
    });

    if (resolution === 'warned') {
      await this.warnUser(flag.userId, moderatorId, `Content flagged for ${flag.flagType}`);
    } else if (resolution === 'banned') {
      await this.banUser(flag.userId, moderatorId, `Banned for repeated ${flag.flagType}`);
    }

    await moderationRepository.createModeratorNote({
      targetType: 'flag',
      targetId: id,
      note: `Resolved: ${resolution}${note ? ` - ${note}` : ''}`,
      createdBy: moderatorId,
    });

    return updated;
  }

  async approveFlag(id, moderatorId) {
    return this.resolveFlag(id, 'approved', moderatorId, 'Content approved after review');
  }

  async removeFlaggedContent(id, moderatorId, reason) {
    return this.resolveFlag(id, 'removed', moderatorId, reason || 'Content removed');
  }

  async escalateFlag(id, moderatorId) {
    const flag = await moderationRepository.getFlagById(id);
    if (!flag) throw new Error('Flag not found');

    return moderationRepository.updateFlag(id, {
      status: 'escalated',
      moderatorId,
    });
  }

  async deleteFlag(id) {
    const flag = await moderationRepository.getFlagById(id);
    if (!flag) throw new Error('Flag not found');
    return moderationRepository.deleteFlag(id);
  }

  // --- User Reporting ---
  async reportContent(
    contentType,
    contentId,
    contentPreview,
    userId,
    reportedBy,
    flagType,
    reason
  ) {
    const existingFlags = await moderationRepository.getFlags({
      contentType,
      contentId,
      status: 'pending',
    });

    if (existingFlags.length > 0) {
      return existingFlags[0];
    }

    return this.createFlag({
      contentType,
      contentId,
      contentPreview,
      userId,
      reportedBy,
      flagType,
      reason,
      severity: 'medium',
      status: 'pending',
    });
  }

  // --- Warning System ---
  async warnUser(userId, issuedBy, reason) {
    const activeWarning = await moderationRepository.getActiveUserWarning(userId);
    let newLevel = WARNING_LEVELS.FIRST;

    if (activeWarning) {
      newLevel = Math.min(activeWarning.warningLevel + 1, WARNING_LEVELS.PERMANENT_BAN);
    }

    const warning = await moderationRepository.createUserWarning({
      userId,
      warningLevel: newLevel,
      reason,
      issuedBy,
    });

    await moderationRepository.createModeratorNote({
      targetType: 'user',
      targetId: userId,
      note: `Warning level ${newLevel} issued: ${reason}`,
      createdBy: issuedBy,
    });

    return { warning, newLevel, isPermanentBan: newLevel === WARNING_LEVELS.PERMANENT_BAN };
  }

  async banUser(userId, issuedBy, reason) {
    return moderationRepository.createUserWarning({
      userId,
      warningLevel: WARNING_LEVELS.PERMANENT_BAN,
      reason,
      issuedBy,
    });
  }

  async getUserWarnings(userId) {
    return moderationRepository.getUserWarnings(userId);
  }

  async getActiveUserWarning(userId) {
    return moderationRepository.getActiveUserWarning(userId);
  }

  // --- Moderator Notes ---
  async addModeratorNote(targetType, targetId, note, createdBy) {
    return moderationRepository.createModeratorNote({ targetType, targetId, note, createdBy });
  }

  async getModeratorNotes(targetType, targetId) {
    return moderationRepository.getModeratorNotes(targetType, targetId);
  }

  // --- Appeal Process ---
  async submitAppeal(flagId, userId, reason) {
    const flag = await moderationRepository.getFlagById(flagId);
    if (!flag) throw new Error('Flag not found');

    if (flag.userId !== userId) throw new Error('Cannot appeal content that is not yours');

    return moderationRepository.createAppeal({ flagId, userId, reason });
  }

  async reviewAppeal(appealId, reviewedBy, decision, decisionNote) {
    const appeal = await moderationRepository.getAppealById(appealId);
    if (!appeal) throw new Error('Appeal not found');

    const updated = await moderationRepository.updateAppeal(appealId, {
      status: 'resolved',
      reviewedBy,
      decision,
      decisionNote,
      resolvedAt: new Date(),
    });

    await moderationRepository.createModeratorNote({
      targetType: 'appeal',
      targetId: appealId,
      note: `Appeal ${decision}: ${decisionNote}`,
      createdBy: reviewedBy,
    });

    return updated;
  }

  async getAppeals(filters = {}) {
    return moderationRepository.getAppeals(filters);
  }

  // --- Analytics ---
  async getFlagStats() {
    return moderationRepository.getFlagStats();
  }

  async getFlagStatsByType() {
    return moderationRepository.getFlagStatsByType();
  }

  async getFlagVolumeOverTime(days = 30) {
    return moderationRepository.getFlagVolumeOverTime(days);
  }

  async getTopViolatingUsers(limit = 10) {
    return moderationRepository.getTopViolatingUsers(limit);
  }

  async getModeratorWorkload() {
    return moderationRepository.getModeratorWorkload();
  }

  async getUserContentHistory(userId, limit = 50) {
    return moderationRepository.getUserContentHistory(userId, limit);
  }

  // --- Bulk Actions ---
  async approveAllFromUser(userId, moderatorId) {
    const flags = await moderationRepository.getFlags({
      userId,
      status: 'pending',
    });

    let approvedCount = 0;
    for (const flag of flags) {
      await this.approveFlag(flag.id, moderatorId);
      approvedCount++;
    }

    return { approvedCount };
  }

  async bulkResolve(flagIds, resolution, moderatorId, note) {
    const results = [];
    for (const id of flagIds) {
      try {
        const result = await this.resolveFlag(id, resolution, moderatorId, note);
        results.push({ id, success: true, result });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }
    return results;
  }
}

export const moderationService = new ModerationService();
