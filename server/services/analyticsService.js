import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const analyticsService = {
  /**
   * Log an analytics event (page view, signup, etc.)
   */
  async logEvent({ type, userId, sessionId, path, metadata }) {
    return prisma.analyticsEvent.create({
      data: {
        type,
        userId,
        sessionId,
        path,
        metadata: metadata || {},
      },
    });
  },

  /**
   * Get overall dashboard metrics (active users, total registrations, events this month)
   */
  async getDashboardSummary() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Active Users (unique users who logged an event this month)
    const activeUsersResult = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const activeUsers = activeUsersResult.length;

    // Events created this month
    const eventsThisMonth = await prisma.post.count({
      where: { createdAt: { gte: firstDayOfMonth } }, // We'll count posts/events as proxy if events table isn't isolated
    });

    // Total Registrations (Events logged with type EVENT_REGISTER)
    const totalRegistrations = await prisma.analyticsEvent.count({
      where: { type: 'EVENT_REGISTER' },
    });

    // Page Views
    const totalPageViews = await prisma.analyticsEvent.count({
      where: { type: 'PAGE_VIEW' },
    });

    return {
      activeUsers,
      eventsThisMonth,
      totalRegistrations,
      totalPageViews,
      engagementRate:
        activeUsers > 0 ? ((totalRegistrations + totalPageViews) / activeUsers).toFixed(2) : 0,
    };
  },

  /**
   * Get User Analytics (Signups over time)
   */
  async getUserAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Signups in last 30 days
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const signupsByDay = users.reduce((acc, user) => {
      const day = user.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return {
      signupsByDay: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
      totalLast30Days: users.length,
    };
  },

  /**
   * Engagement Funnel (Visit -> Register -> Attend)
   */
  async getEngagementFunnel() {
    const visits = await prisma.analyticsEvent.count({
      where: { type: 'PAGE_VIEW', path: { contains: '/events' } },
    });
    const registers = await prisma.analyticsEvent.count({ where: { type: 'EVENT_REGISTER' } });
    const attends = await prisma.analyticsEvent.count({ where: { type: 'EVENT_ATTEND' } });

    return [
      { step: 'Event Views', count: visits },
      { step: 'Registrations', count: registers },
      { step: 'Attended', count: attends },
    ];
  },

  /**
   * Run a Custom Report based on the saved JSON config.
   */
  async executeCustomReport(reportConfig) {
    // A simplified dynamic executor.
    // In a real app, this parses the `metrics`, `dimensions`, and `filters` to run Prisma queries.

    const { metric, timeRange } = reportConfig;
    const dateFilter =
      timeRange === '30d'
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    let data = [];
    if (metric === 'page_views') {
      const events = await prisma.analyticsEvent.findMany({
        where: { type: 'PAGE_VIEW', createdAt: { gte: dateFilter } },
        select: { createdAt: true },
      });
      data = aggregateByDay(events);
    } else if (metric === 'signups') {
      const users = await prisma.user.findMany({
        where: { createdAt: { gte: dateFilter } },
        select: { createdAt: true },
      });
      data = aggregateByDay(users);
    }

    return { data };
  },

  // Custom Reports CRUD
  async saveCustomReport({ name, description, config, scheduleType }) {
    return prisma.customReport.create({
      data: { name, description, config, scheduleType },
    });
  },

  async getCustomReports() {
    return prisma.customReport.findMany({ orderBy: { createdAt: 'desc' } });
  },
};

function aggregateByDay(records) {
  const grouped = records.reduce((acc, r) => {
    const day = r.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([date, count]) => ({ date, count }));
}
