import logger from './logger.js';

const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 100;
const SLOW_REQUEST_THRESHOLD_MS = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS, 10) || 500;
const SLOW_EXTERNAL_API_THRESHOLD_MS =
  parseInt(process.env.SLOW_EXTERNAL_API_THRESHOLD_MS, 10) || 1000;

export function logSlowQuery(query, durationMs, meta = {}) {
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn('Slow database query detected', {
      query: query.substring(0, 500),
      durationMs,
      threshold: SLOW_QUERY_THRESHOLD_MS,
      ...meta,
      isSlowQuery: true,
    });
  }
}

export function logSlowRequest(method, path, durationMs, statusCode, meta = {}) {
  if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
    logger.warn('Slow API request detected', {
      method,
      path,
      durationMs,
      statusCode,
      threshold: SLOW_REQUEST_THRESHOLD_MS,
      ...meta,
      isSlowRequest: true,
    });
  }
}

export function logSlowExternalApi(apiName, url, durationMs, statusCode, meta = {}) {
  if (durationMs > SLOW_EXTERNAL_API_THRESHOLD_MS) {
    logger.warn('Slow external API call detected', {
      apiName,
      url,
      durationMs,
      statusCode,
      threshold: SLOW_EXTERNAL_API_THRESHOLD_MS,
      ...meta,
      isSlowExternalApi: true,
    });
  }
}

export function logPerformanceMetric(name, value, unit, meta = {}) {
  logger.info('Performance metric', {
    metricName: name,
    metricValue: value,
    metricUnit: unit,
    ...meta,
  });
}

export function createPerformanceTracker(name) {
  const start = Date.now();
  return {
    end(meta = {}) {
      const duration = Date.now() - start;
      logPerformanceMetric(name, duration, 'ms', meta);
      return duration;
    },
    getElapsed() {
      return Date.now() - start;
    },
  };
}

export function createQueryPerformanceTracker() {
  return {
    track(query, meta = {}) {
      const start = Date.now();
      return {
        end(error = null) {
          const duration = Date.now() - start;
          logSlowQuery(query, duration, { ...meta, error: error?.message });
          return duration;
        },
      };
    },
  };
}
