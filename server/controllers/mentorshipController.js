import { mentorshipService } from '../services/mentorshipService.js';
import {
  registerMentorSchema,
  updateMentorSchema,
  requestMentorshipSchema,
  logSessionSchema,
  buddyPairSchema,
  mentorshipPaginationSchema,
} from '../schemas/mentorshipSchema.js';

function wrapAsync(fn) {
  return (req, res) =>
    Promise.resolve(fn(req, res)).catch((e) => {
      console.error('[mentorshipController]', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    });
}

export const listMentors = wrapAsync(async (req, res) => {
  const { page, limit, domain, q } = mentorshipPaginationSchema.parse(req.query);
  const result = await mentorshipService.listMentors({ page, limit, domain, q });
  return res.json({
    mentors: result.rows,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit) || 1,
    },
  });
});

export const getMentor = wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid mentor ID' });
  const mentor = await mentorshipService.getMentor(id);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
  return res.json({ mentor });
});

export const registerMentor = wrapAsync(async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const input = registerMentorSchema.parse({
    ...req.body,
    name: req.studentUser.name,
    email: req.studentUser.email,
  });
  const mentor = await mentorshipService.registerMentor(input);
  if (!mentor) return res.status(503).json({ error: 'Mentorship system is offline' });
  return res.status(201).json({ mentor });
});

export const updateMentor = wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid mentor ID' });
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const mentor = await mentorshipService.getMentor(id);
  if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

  const isAdmin = req.studentUser.role === 'admin';
  if (mentor.email !== req.studentUser.email && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden: You do not own this mentor profile' });
  }

  const input = updateMentorSchema.parse(req.body);
  const updated = await mentorshipService.updateMentor(id, input);
  return res.json({ mentor: updated });
});

export const requestMentorship = wrapAsync(async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const input = requestMentorshipSchema.parse({
    ...req.body,
    mentee_name: req.studentUser.name,
    mentee_email: req.studentUser.email,
  });
  const mentorship = await mentorshipService.requestMentorship(input);
  if (!mentorship) return res.status(503).json({ error: 'Mentorship system is offline' });
  return res.status(201).json({ mentorship });
});

export const listMentorships = wrapAsync(async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { page, limit, status } = req.query;
  const isAdmin = req.studentUser.role === 'admin';
  const email = isAdmin && req.query.email ? req.query.email : req.studentUser.email;

  const result = await mentorshipService.listMentorships({
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    status: status || undefined,
    email: isAdmin && !req.query.email ? undefined : email,
  });
  return res.json({ mentorships: result.rows, total: result.total });
});

export const getMentorship = wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid mentorship ID' });
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const mentorship = await mentorshipService.getMentorship(id);
  if (!mentorship) return res.status(404).json({ error: 'Mentorship not found' });

  const mentor = await mentorshipService.getMentor(mentorship.mentorId);
  const mentorEmail = mentor ? mentor.email : null;

  const isAdmin = req.studentUser.role === 'admin';
  const isAuthorized =
    isAdmin ||
    mentorship.menteeEmail === req.studentUser.email ||
    mentorEmail === req.studentUser.email;
  if (!isAuthorized) {
    return res
      .status(403)
      .json({ error: 'Forbidden: You are not authorized to view this mentorship' });
  }

  return res.json({ mentorship });
});

export const updateMentorshipStatus = wrapAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid mentorship ID' });
  if (!req.studentUser && !req.adminSession) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const mentorship = await mentorshipService.getMentorship(id);
  if (!mentorship) return res.status(404).json({ error: 'Mentorship not found' });

  const { status } = req.body;
  if (!['active', 'rejected', 'completed'].includes(status)) {
    return res
      .status(400)
      .json({ error: 'Invalid status. Must be active, rejected, or completed' });
  }

  const isAdmin = req.adminSession || req.studentUser?.role === 'admin';
  const mentor = await mentorshipService.getMentor(mentorship.mentorId);
  const mentorEmail = mentor ? mentor.email : null;

  const isMentor = req.studentUser && req.studentUser.email === mentorEmail;
  const isMentee = req.studentUser && req.studentUser.email === mentorship.menteeEmail;

  if (!isAdmin && !isMentor && !isMentee) {
    return res
      .status(403)
      .json({ error: 'Forbidden: You are not authorized to update this status' });
  }

  if (isMentee && !isAdmin && status !== 'completed') {
    return res
      .status(403)
      .json({ error: 'Forbidden: Mentees can only mark mentorship as completed' });
  }

  const updated = await mentorshipService.updateMentorshipStatus(id, status);
  return res.json({ mentorship: updated });
});

export const logSession = wrapAsync(async (req, res) => {
  const mentorshipId = parseInt(req.params.id, 10);
  if (isNaN(mentorshipId)) return res.status(400).json({ error: 'Invalid mentorship ID' });
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const mentorship = await mentorshipService.getMentorship(mentorshipId);
  if (!mentorship) return res.status(404).json({ error: 'Mentorship not found' });

  const mentor = await mentorshipService.getMentor(mentorship.mentorId);
  const mentorEmail = mentor ? mentor.email : null;

  const isAdmin = req.studentUser.role === 'admin';
  const isAuthorized =
    isAdmin ||
    mentorship.menteeEmail === req.studentUser.email ||
    mentorEmail === req.studentUser.email;
  if (!isAuthorized) {
    return res
      .status(403)
      .json({ error: 'Forbidden: You are not authorized to log sessions for this mentorship' });
  }

  const input = logSessionSchema.parse(req.body);
  const session = await mentorshipService.logSession(mentorshipId, input);
  if (!session) return res.status(404).json({ error: 'Failed to log session' });
  return res.status(201).json({ session });
});

export const listSessions = wrapAsync(async (req, res) => {
  const mentorshipId = parseInt(req.params.id, 10);
  if (isNaN(mentorshipId)) return res.status(400).json({ error: 'Invalid mentorship ID' });
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const mentorship = await mentorshipService.getMentorship(mentorshipId);
  if (!mentorship) return res.status(404).json({ error: 'Mentorship not found' });

  const mentor = await mentorshipService.getMentor(mentorship.mentorId);
  const mentorEmail = mentor ? mentor.email : null;

  const isAdmin = req.studentUser.role === 'admin';
  const isAuthorized =
    isAdmin ||
    mentorship.menteeEmail === req.studentUser.email ||
    mentorEmail === req.studentUser.email;
  if (!isAuthorized) {
    return res
      .status(403)
      .json({ error: 'Forbidden: You are not authorized to view sessions for this mentorship' });
  }

  const { page, limit } = req.query;
  const result = await mentorshipService.listSessions(mentorshipId, {
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 50)),
  });
  return res.json({ sessions: result.rows, total: result.total });
});

export const createBuddyPair = wrapAsync(async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const input = buddyPairSchema.parse(req.body);

  const isAdmin = req.studentUser.role === 'admin';
  const isSelf =
    input.buddy1_email === req.studentUser.email || input.buddy2_email === req.studentUser.email;
  if (!isSelf && !isAdmin) {
    return res
      .status(403)
      .json({ error: 'Forbidden: You can only register buddy pairings for yourself' });
  }

  const pair = await mentorshipService.createBuddyPair(input);
  if (!pair) return res.status(503).json({ error: 'Mentorship system is offline' });
  return res.status(201).json({ pair });
});

export const listBuddyPairs = wrapAsync(async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { page, limit } = req.query;
  const isAdmin = req.studentUser.role === 'admin';
  const email = isAdmin && req.query.email ? req.query.email : req.studentUser.email;

  const result = await mentorshipService.listBuddyPairs({
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 50)),
    email: isAdmin && !req.query.email ? undefined : email,
  });
  return res.json({ pairs: result.rows, total: result.total });
});

export const adminListAll = wrapAsync(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await mentorshipService.adminListAll({
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 50)),
    status,
  });
  return res.json({ mentorships: result.rows, total: result.total });
});

export const adminListMentors = wrapAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await mentorshipService.adminListMentors({
    page: Math.max(1, parseInt(page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 50)),
  });
  return res.json({ mentors: result.rows, total: result.total });
});
