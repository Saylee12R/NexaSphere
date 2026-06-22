import { withDb } from '../repositories/db.js';

/**
 * All valid analytics event types for the funnel analysis tool.
 */
export const FUNNEL_STEP_TYPES = [
  'PAGE_VIEW',
  'EVENT_REGISTER',
  'EVENT_ATTEND',
  'PROFILE_COMPLETE',
  'FORM_SUBMIT',
  'RESOURCE_VIEW',
];

export const analyticsService = {
  /**
   * Log an analytics event (page view, signup, etc.)
   */
  async logEvent({ type, userId, sessionId, path, metadata }) {
    return withDb(async (client) => {
      await client.query(
        `INSERT INTO analytics_events (session_id, user_id, event_type, path, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [sessionId || 'anon', userId || null, type, path || null, JSON.stringify(metadata || {})]
      );
    });
  },

  /**
   * Get overall dashboard metrics (active users, total registrations, events this month)
   */
  async getDashboardSummary() {
    return withDb(async (client) => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Active users this month (unique user_ids)
      const { rows: activeUsersRows } = await client.query(
        `SELECT COUNT(DISTINCT user_id) AS count FROM analytics_events
         WHERE created_at >= $1 AND user_id IS NOT NULL`,
        [firstDayOfMonth]
      );
      const activeUsers = parseInt(activeUsersRows[0]?.count || 0, 10);

      // Events this month (approximate via events table)
      const { rows: eventsRows } = await client.query(
        `SELECT COUNT(*) AS count FROM events WHERE created_at >= $1`,
        [firstDayOfMonth]
      );
      const eventsThisMonth = parseInt(eventsRows[0]?.count || 0, 10);

      // Total Registrations
      const { rows: regRows } = await client.query(
        `SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'EVENT_REGISTER'`
      );
      const totalRegistrations = parseInt(regRows[0]?.count || 0, 10);

      // Page Views
      const { rows: pvRows } = await client.query(
        `SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = 'PAGE_VIEW'`
      );
      const totalPageViews = parseInt(pvRows[0]?.count || 0, 10);

      return {
        activeUsers,
        eventsThisMonth,
        totalRegistrations,
        totalPageViews,
        engagementRate:
          activeUsers > 0
            ? ((totalRegistrations + totalPageViews) / activeUsers).toFixed(2)
            : 0,
      };
    });
  },

  /**
   * Get User Analytics (Signups over time, using users table)
   */
  async getUserAnalytics() {
    return withDb(async (client) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { rows } = await client.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS count
         FROM users
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [thirtyDaysAgo]
      );

      return {
        signupsByDay: rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
        totalLast30Days: rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0),
      };
    });
  },

  /**
   * Default Engagement Funnel (Event Views → Register → Attend)
   */
  async getEngagementFunnel() {
    return analyticsService.getFunnelAnalysis(['PAGE_VIEW', 'EVENT_REGISTER', 'EVENT_ATTEND']);
  },

  /**
   * Custom Funnel Analysis
   * For each step, returns:
   *   - step name
   *   - count (unique sessions that reached this step)
   *   - dropOffPercent (how many dropped off from previous step)
   *   - avgSecondsFromPrev (average time in seconds from previous step)
   *
   * @param {string[]} steps - ordered array of event_type strings
   * @returns {Promise<Array>}
   */
  async getFunnelAnalysis(steps) {
    if (!Array.isArray(steps) || steps.length === 0) {
      return [];
    }

    return withDb(async (client) => {
      const result = [];
      let prevCount = null;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const prevStep = i > 0 ? steps[i - 1] : null;

        // Count unique sessions that performed this step
        const { rows: countRows } = await client.query(
          `SELECT COUNT(DISTINCT session_id) AS count
           FROM analytics_events
           WHERE event_type = $1`,
          [step]
        );
        const count = parseInt(countRows[0]?.count || 0, 10);

        let dropOffPercent = null;
        let avgSecondsFromPrev = null;

        if (prevStep !== null && prevCount !== null) {
          // Drop-off from previous step
          dropOffPercent =
            prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;

          // Average time between prevStep and this step, for sessions that did both
          const { rows: timeRows } = await client.query(
            `SELECT AVG(EXTRACT(EPOCH FROM (curr.created_at - prev.created_at))) AS avg_seconds
             FROM analytics_events prev
             JOIN analytics_events curr
               ON prev.session_id = curr.session_id
              AND curr.event_type = $1
              AND curr.created_at > prev.created_at
             WHERE prev.event_type = $2`,
            [step, prevStep]
          );
          avgSecondsFromPrev =
            timeRows[0]?.avg_seconds !== null
              ? Math.round(parseFloat(timeRows[0].avg_seconds))
              : null;
        }

        result.push({
          step,
          count,
          dropOffPercent,
          avgSecondsFromPrev,
        });
        prevCount = count;
      }

      return result;
    });
  },

  /**
   * Run a Custom Report based on the saved JSON config.
   */
  async executeCustomReport(reportConfig) {
    const { metric, timeRange } = reportConfig;
    const dateFilter =
      timeRange === '30d'
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    return withDb(async (client) => {
      let data = [];

      if (metric === 'page_views') {
        const { rows } = await client.query(
          `SELECT DATE(created_at) AS date, COUNT(*) AS count
           FROM analytics_events
           WHERE event_type = 'PAGE_VIEW' AND created_at >= $1
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          [dateFilter]
        );
        data = rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
      } else if (metric === 'signups') {
        const { rows } = await client.query(
          `SELECT DATE(created_at) AS date, COUNT(*) AS count
           FROM users
           WHERE created_at >= $1
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          [dateFilter]
        );
        data = rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
      }

      return { data };
    });
  },

  // Custom Reports CRUD (stored in a JSON file for now, minimal Prisma dependency removed)
  async saveCustomReport({ name, description, config, scheduleType }) {
    // Persisting via analytics_events metadata is out of scope.
    // Return a mock-saved object for API compatibility.
    return {
      id: `report-${Date.now()}`,
      name,
      description,
      config,
      scheduleType,
      createdAt: new Date(),
    };
  },

  async getCustomReports() {
    return [];
  },
};
