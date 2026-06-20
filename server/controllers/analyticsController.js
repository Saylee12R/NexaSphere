import { analyticsService } from '../services/analyticsService.js';

function wrapAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const logEvent = wrapAsync(async (req, res) => {
  const { type, path, metadata } = req.body;
  const userId = req.user?.id; // Optional
  const sessionId = req.headers['x-session-id'] || req.ip;

  await analyticsService.logEvent({ type, userId, sessionId, path, metadata });
  res.status(202).json({ success: true });
});

export const getDashboardSummary = wrapAsync(async (req, res) => {
  const summary = await analyticsService.getDashboardSummary();
  res.json({ success: true, summary });
});

export const getUserAnalytics = wrapAsync(async (req, res) => {
  const analytics = await analyticsService.getUserAnalytics();
  res.json({ success: true, analytics });
});

export const getEngagementFunnel = wrapAsync(async (req, res) => {
  const funnel = await analyticsService.getEngagementFunnel();
  res.json({ success: true, funnel });
});

export const executeCustomReport = wrapAsync(async (req, res) => {
  const { metric, timeRange } = req.body;
  const report = await analyticsService.executeCustomReport({ metric, timeRange });
  res.json({ success: true, report });
});

export const saveCustomReport = wrapAsync(async (req, res) => {
  const { name, description, config, scheduleType } = req.body;
  const report = await analyticsService.saveCustomReport({
    name,
    description,
    config,
    scheduleType,
  });
  res.json({ success: true, report });
});

export const getCustomReports = wrapAsync(async (req, res) => {
  const reports = await analyticsService.getCustomReports();
  res.json({ success: true, reports });
});
