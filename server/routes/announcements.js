import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import { announcementsService } from '../services/announcementsService.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import eventManager from '../services/eventEmitterService.js';
import logger from '../utils/logger.js';

const router = Router();

// Student Endpoint to fetch active, targeted announcements
router.get('/api/announcements', requireStudentAuth, apiRateLimiter, async (req, res) => {
  try {
    const user = {
      id: req.studentUser.sub || req.studentUser.id,
      role: req.studentUser.role || 'student',
      stage: req.query.stage || req.studentUser.stage || 'all',
      department: req.query.department || req.studentUser.department || 'all',
      graduationYear: req.query.graduationYear
        ? Number(req.query.graduationYear)
        : req.studentUser.graduationYear
          ? Number(req.studentUser.graduationYear)
          : null,
    };
    const list = await announcementsService.listActiveAnnouncementsForUser(user);
    return res.json({ announcements: list });
  } catch (err) {
    logger.error('Error fetching announcements for user:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Admin endpoints
router.get(
  '/api/admin/announcements',
  adminAuthMiddleware.requireScope('events:read'),
  apiRateLimiter,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const result = await announcementsService.listAnnouncements({ page, limit });
      return res.json(result);
    } catch (err) {
      logger.error('Error listing admin announcements:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/api/admin/announcements',
  adminAuthMiddleware.requireScope('events:write'),
  apiRateLimiter,
  async (req, res) => {
    try {
      const created = await announcementsService.createAnnouncement(req.body);
      // Real-time broadcast if published immediately
      if (created.status === 'published') {
        eventManager.emit('admin-announcement', {
          title: created.title,
          message: created.content,
          link: created.ctaUrl,
        });
      }
      return res.status(201).json(created);
    } catch (err) {
      logger.error('Error creating announcement:', err.message);
      return res
        .status(err.name === 'ZodError' ? 400 : 500)
        .json({ error: err.message, details: err.issues });
    }
  }
);

router.put(
  '/api/admin/announcements/:id',
  adminAuthMiddleware.requireScope('events:write'),
  apiRateLimiter,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid announcement ID' });
      }
      const updated = await announcementsService.updateAnnouncement(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      // Real-time broadcast if published or updated status to published
      if (updated.status === 'published') {
        eventManager.emit('admin-announcement', {
          title: updated.title,
          message: updated.content,
          link: updated.ctaUrl,
        });
      }
      return res.json(updated);
    } catch (err) {
      logger.error('Error updating announcement:', err.message);
      return res
        .status(err.name === 'ZodError' ? 400 : 500)
        .json({ error: err.message, details: err.issues });
    }
  }
);

router.delete(
  '/api/admin/announcements/:id',
  adminAuthMiddleware.requireScope('events:write'),
  apiRateLimiter,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid announcement ID' });
      }
      const success = await announcementsService.deleteAnnouncement(id);
      if (!success) {
        return res.status(404).json({ error: 'Announcement not found' });
      }
      return res.json({ success: true });
    } catch (err) {
      logger.error('Error deleting announcement:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
