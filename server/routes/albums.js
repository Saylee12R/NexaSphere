/**
 * server/routes/albums.js
 * Album CRUD, sub-albums, cover photo, collaborative uploads, featured photos
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../db');

// ── GET /api/albums?eventId=xxx ───────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    const albums = await db.albums.forEvent(eventId);
    res.json({ albums });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/albums ──────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { eventId, name, description, parentAlbumId, isCollaborative } = req.body;
    if (!eventId || !name) return res.status(400).json({ error: 'eventId and name required' });

    const album = await db.albums.create({
      eventId,
      name,
      description: description || '',
      parentAlbumId: parentAlbumId || null,
      isCollaborative: isCollaborative || false,
      createdById: req.user.id,
      coverPhotoId: null,
      photoCount: 0,
    });

    res.status(201).json(album);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/albums/:id ─────────────────────────────────────────────────────
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const album = await db.albums.findById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    if (album.createdById !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { name, description, coverPhotoId } = req.body;
    const updated = await db.albums.update(req.params.id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(coverPhotoId && { coverPhotoId }),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/albums/:id ────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const album = await db.albums.findById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    if (album.createdById !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await db.albums.delete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/albums/:id/featured ─────────────────────────────────────────────
// Organizer can mark individual photos as "featured" in the album
router.post('/:id/featured', authenticate, async (req, res) => {
  try {
    const { photoId } = req.body;
    if (!photoId) return res.status(400).json({ error: 'photoId required' });

    await db.albums.featurePhoto(req.params.id, photoId, req.user.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
