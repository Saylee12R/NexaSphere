import { analyticsService, FUNNEL_STEP_TYPES } from '../services/analyticsService.js';

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

/**
 * POST /api/admin/analytics/funnel/custom
 * Body: { steps: ['PAGE_VIEW', 'EVENT_REGISTER', 'EVENT_ATTEND'] }
 * Returns detailed funnel analysis with drop-off and time-between-steps.
 */
export const getCustomFunnel = wrapAsync(async (req, res) => {
  const { steps } = req.body;

  if (!Array.isArray(steps) || steps.length < 2) {
    return res.status(400).json({ error: 'At least 2 funnel steps are required' });
  }

  // Validate step names against known types
  const invalid = steps.filter((s) => !FUNNEL_STEP_TYPES.includes(s));
  if (invalid.length > 0) {
    return res
      .status(400)
      .json({ error: `Invalid step type(s): ${invalid.join(', ')}`, validTypes: FUNNEL_STEP_TYPES });
  }

  const funnel = await analyticsService.getFunnelAnalysis(steps);
  res.json({ success: true, funnel, validStepTypes: FUNNEL_STEP_TYPES });
});

/**
 * GET /api/admin/analytics/funnel/steps
 * Returns the list of valid step types for the UI to build the step selector.
 */
export const getFunnelStepTypes = wrapAsync(async (req, res) => {
  res.json({ success: true, stepTypes: FUNNEL_STEP_TYPES });
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
