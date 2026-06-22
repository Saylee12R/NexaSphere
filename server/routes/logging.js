import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { getErrorStats, getAllErrorGroups, getErrorGroup } from '../utils/errorTracker.js';
import { getAllActiveTraces, getActiveTraceInfo } from '../middleware/enhancedTracingMiddleware.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/errors', auth('admin'), async (req, res) => {
  try {
    const stats = getErrorStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching error stats', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/errors/groups', auth('admin'), async (req, res) => {
  try {
    const groups = getAllErrorGroups();
    res.json({ success: true, data: groups });
  } catch (error) {
    logger.error('Error fetching error groups', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/errors/groups/:fingerprint', auth('admin'), async (req, res) => {
  try {
    const group = getErrorGroup(req.params.fingerprint);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Error group not found' });
    }
    res.json({ success: true, data: group });
  } catch (error) {
    logger.error('Error fetching error group', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/traces', auth('admin'), async (req, res) => {
  try {
    const traces = getAllActiveTraces();
    res.json({ success: true, data: traces });
  } catch (error) {
    logger.error('Error fetching traces', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/traces/:reqId', auth('admin'), async (req, res) => {
  try {
    const traceInfo = getActiveTraceInfo(req.params.reqId);
    if (!traceInfo) {
      return res.status(404).json({ success: false, error: 'Trace not found' });
    }
    res.json({ success: true, data: traceInfo });
  } catch (error) {
    logger.error('Error fetching trace', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
