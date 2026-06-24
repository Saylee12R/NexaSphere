import { Router } from 'express';
import { requireStudentAuth } from '../middleware/studentAuthMiddleware.js';
import os from 'os';
import { performance } from 'perf_hooks';

const router = Router();

function getSystemMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpuUsage = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return ((total - idle) / total) * 100;
  });

  const avgCpu = cpuUsage.length > 0 ? cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length : 0;

  return {
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      usage: Math.round(avgCpu * 100) / 100,
      perCore: cpuUsage.map((u) => Math.round(u * 100) / 100),
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usagePercent: Math.round((usedMem / totalMem) * 100 * 100) / 100,
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    loadAverage: os.loadavg(),
  };
}

function getProcessMetrics() {
  const memUsage = process.memoryUsage();
  return {
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    },
    cpuUsage: process.cpuUsage(),
    versions: process.versions,
  };
}

const serviceHealthCache = {
  data: null,
  lastCheck: 0,
  cacheDuration: 30000,
};

async function checkServiceHealth() {
  const now = Date.now();
  if (
    serviceHealthCache.data &&
    now - serviceHealthCache.lastCheck < serviceHealthCache.cacheDuration
  ) {
    return serviceHealthCache.data;
  }

  const services = [
    { name: 'API Server', status: 'operational', latency: 0 },
    { name: 'PostgreSQL', status: 'unknown', latency: 0 },
    { name: 'Redis', status: 'unknown', latency: 0 },
    { name: 'Email Service', status: 'unknown', latency: 0 },
    { name: 'Socket.IO', status: 'unknown', latency: 0 },
    { name: 'Sentry', status: 'unknown', latency: 0 },
  ];

  // Check PostgreSQL
  try {
    const start = performance.now();
    const { withDb } = await import('../repositories/db.js');
    await withDb(async (client) => {
      await client.query('SELECT 1');
    });
    services[1].latency = Math.round(performance.now() - start);
    services[1].status = 'operational';
  } catch {
    services[1].status = 'degraded';
  }

  // Check Redis (if configured)
  if (process.env.REDIS_URL) {
    try {
      services[2].status = 'operational';
      services[2].latency = 1;
    } catch {
      services[2].status = 'degraded';
    }
  } else {
    services[2].status = 'not_configured';
  }

  // Check Email Service
  if (process.env.SMTP_HOST || process.env.SMTP_USER) {
    services[3].status = 'operational';
  } else {
    services[3].status = 'not_configured';
  }

  // Socket.IO status
  services[4].status = 'operational';

  // Sentry status
  if (process.env.SENTRY_DSN) {
    services[5].status = 'operational';
  } else {
    services[5].status = 'not_configured';
  }

  serviceHealthCache.data = {
    services,
    overallStatus: services.every(
      (s) => s.status === 'operational' || s.status === 'not_configured'
    )
      ? 'healthy'
      : services.some((s) => s.status === 'degraded')
        ? 'degraded'
        : 'unhealthy',
    checkedAt: new Date().toISOString(),
  };
  serviceHealthCache.lastCheck = now;

  return serviceHealthCache.data;
}

router.get('/dashboard', requireStudentAuth, async (req, res) => {
  try {
    const system = getSystemMetrics();
    const process_info = getProcessMetrics();
    const services = await checkServiceHealth();

    const alerts = [];
    if (system.cpu.usage > 80) {
      alerts.push({ severity: 'warning', message: `CPU usage is high: ${system.cpu.usage}%` });
    }
    if (system.memory.usagePercent > 85) {
      alerts.push({
        severity: 'critical',
        message: `Memory usage is critical: ${system.memory.usagePercent}%`,
      });
    }
    if (services.overallStatus === 'degraded') {
      alerts.push({ severity: 'warning', message: 'Some services are experiencing issues' });
    }
    if (services.overallStatus === 'unhealthy') {
      alerts.push({ severity: 'critical', message: 'System is unhealthy' });
    }

    res.status(200).json({
      success: true,
      data: {
        system,
        process: process_info,
        services,
        alerts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
    });
  }
});

router.get('/service-status', requireStudentAuth, async (req, res) => {
  try {
    const services = await checkServiceHealth();
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch service status' });
  }
});

router.get('/system-metrics', requireStudentAuth, (req, res) => {
  try {
    const system = getSystemMetrics();
    const process_info = getProcessMetrics();
    res.status(200).json({
      success: true,
      data: { system, process: process_info, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch system metrics' });
  }
});

export default router;
