import { moderationService } from '../services/moderationService.js';

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

// --- Flagged Content ---
export const createFlag = wrapAsync(async (req, res) => {
  const { contentType, contentId, contentPreview, userId, flagType, reason } = req.body;
  if (!contentType || !contentId || !flagType) {
    return res.status(400).json({ error: 'contentType, contentId, and flagType are required' });
  }

  const flag = await moderationService.reportContent(
    contentType,
    contentId,
    contentPreview,
    userId,
    req.studentUser?.id,
    flagType,
    reason
  );
  return res.status(201).json(flag);
});

export const getFlags = wrapAsync(async (req, res) => {
  const { status, flagType, severity, contentType, userId, limit, offset } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (flagType) filters.flagType = flagType;
  if (severity) filters.severity = severity;
  if (contentType) filters.contentType = contentType;
  if (userId) filters.userId = userId;
  if (limit) filters.limit = parseInt(limit, 10);
  if (offset) filters.offset = parseInt(offset, 10);

  const flags = await moderationService.getFlags(filters);
  return res.status(200).json({ flags });
});

export const getFlagById = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const flag = await moderationService.getFlagById(id);
  return res.status(200).json(flag);
});

export const resolveFlag = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { resolution, note } = req.body;
  if (!resolution) {
    return res
      .status(400)
      .json({ error: 'Resolution is required (approved, removed, warned, banned)' });
  }

  const validResolutions = ['approved', 'removed', 'warned', 'banned'];
  if (!validResolutions.includes(resolution)) {
    return res
      .status(400)
      .json({ error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}` });
  }

  const updated = await moderationService.resolveFlag(id, resolution, req.studentUser?.id, note);
  return res.status(200).json(updated);
});

export const approveFlag = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await moderationService.approveFlag(id, req.studentUser?.id);
  return res.status(200).json(updated);
});

export const removeFlaggedContent = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const updated = await moderationService.removeFlaggedContent(id, req.studentUser?.id, reason);
  return res.status(200).json(updated);
});

export const escalateFlag = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const updated = await moderationService.escalateFlag(id, req.studentUser?.id);
  return res.status(200).json(updated);
});

export const deleteFlag = wrapAsync(async (req, res) => {
  const { id } = req.params;
  await moderationService.deleteFlag(id);
  return res.status(200).json({ success: true });
});

// --- User Warnings ---
export const warnUser = wrapAsync(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  const result = await moderationService.warnUser(userId, req.studentUser?.id, reason);
  return res.status(200).json(result);
});

export const getUserWarnings = wrapAsync(async (req, res) => {
  const { userId } = req.params;
  const warnings = await moderationService.getUserWarnings(userId);
  return res.status(200).json({ warnings });
});

// --- Moderator Notes ---
export const addModeratorNote = wrapAsync(async (req, res) => {
  const { targetType, targetId, note } = req.body;
  if (!targetType || !targetId || !note) {
    return res.status(400).json({ error: 'targetType, targetId, and note are required' });
  }

  const result = await moderationService.addModeratorNote(
    targetType,
    targetId,
    note,
    req.studentUser?.id
  );
  return res.status(201).json(result);
});

export const getModeratorNotes = wrapAsync(async (req, res) => {
  const { targetType, targetId } = req.query;
  if (!targetType || !targetId) {
    return res.status(400).json({ error: 'targetType and targetId are required' });
  }

  const notes = await moderationService.getModeratorNotes(targetType, targetId);
  return res.status(200).json({ notes });
});

// --- Appeals ---
export const submitAppeal = wrapAsync(async (req, res) => {
  const { flagId, reason } = req.body;
  if (!flagId || !reason) {
    return res.status(400).json({ error: 'flagId and reason are required' });
  }

  const appeal = await moderationService.submitAppeal(flagId, req.studentUser?.id, reason);
  return res.status(201).json(appeal);
});

export const reviewAppeal = wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { decision, decisionNote } = req.body;
  if (!decision) {
    return res.status(400).json({ error: 'Decision is required (upheld, overturned)' });
  }

  const validDecisions = ['upheld', 'overturned'];
  if (!validDecisions.includes(decision)) {
    return res
      .status(400)
      .json({ error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` });
  }

  const updated = await moderationService.reviewAppeal(
    id,
    req.studentUser?.id,
    decision,
    decisionNote
  );
  return res.status(200).json(updated);
});

export const getAppeals = wrapAsync(async (req, res) => {
  const { status, userId } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (userId) filters.userId = userId;

  const appeals = await moderationService.getAppeals(filters);
  return res.status(200).json({ appeals });
});

// --- Analytics ---
export const getFlagStats = wrapAsync(async (req, res) => {
  const stats = await moderationService.getFlagStats();
  return res.status(200).json(stats);
});

export const getFlagStatsByType = wrapAsync(async (req, res) => {
  const stats = await moderationService.getFlagStatsByType();
  return res.status(200).json({ stats });
});

export const getFlagVolumeOverTime = wrapAsync(async (req, res) => {
  const { days } = req.query;
  const volume = await moderationService.getFlagVolumeOverTime(days ? parseInt(days, 10) : 30);
  return res.status(200).json({ volume });
});

export const getTopViolatingUsers = wrapAsync(async (req, res) => {
  const { limit } = req.query;
  const users = await moderationService.getTopViolatingUsers(limit ? parseInt(limit, 10) : 10);
  return res.status(200).json({ users });
});

export const getModeratorWorkload = wrapAsync(async (req, res) => {
  const workload = await moderationService.getModeratorWorkload();
  return res.status(200).json({ workload });
});

export const getUserContentHistory = wrapAsync(async (req, res) => {
  const { userId } = req.params;
  const { limit } = req.query;
  const history = await moderationService.getUserContentHistory(
    userId,
    limit ? parseInt(limit, 10) : 50
  );
  return res.status(200).json({ history });
});

// --- Bulk Actions ---
export const approveAllFromUser = wrapAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await moderationService.approveAllFromUser(userId, req.studentUser?.id);
  return res.status(200).json(result);
});

export const bulkResolve = wrapAsync(async (req, res) => {
  const { flagIds, resolution, note } = req.body;
  if (!flagIds || !Array.isArray(flagIds) || !resolution) {
    return res.status(400).json({ error: 'flagIds (array) and resolution are required' });
  }

  const results = await moderationService.bulkResolve(
    flagIds,
    resolution,
    req.studentUser?.id,
    note
  );
  return res.status(200).json({ results });
});
