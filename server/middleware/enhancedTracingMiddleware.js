import crypto from 'crypto';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { appContext } from '../config/appContext.js';
import { logSlowRequest, createQueryPerformanceTracker } from '../utils/performanceLogger.js';
import { trackError } from '../utils/errorTracker.js';
import { maskSensitiveData } from '../utils/sensitiveDataMasking.js';

export const activeTraces = new Map();
const tracer = trace.getTracer('nexasphere-api');
const queryTracker = createQueryPerformanceTracker();

export function enhancedTracingMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  const startTime = Date.now();

  req.reqId = reqId;
  res.setHeader('X-Request-ID', reqId);

  const traceEntry = {
    reqId,
    method: req.method,
    url: req.originalUrl || req.url,
    startTime,
    queries: [],
    duration: 0,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
  };

  activeTraces.set(reqId, traceEntry);

  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.originalUrl || req.url,
      'http.route': req.path,
      'nexasphere.request_id': reqId,
      'http.user_agent': req.headers['user-agent'] || '',
    },
  });

  const spanContext = trace.setSpan(context.active(), span);

  context.with(spanContext, () => {
    const store = { reqId, traceEntry };
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const sc = activeSpan.spanContext();
      store.traceId = sc.traceId;
    }

    appContext.run(store, () => {
      const originalEnd = res.end;
      res.end = function (...args) {
        const duration = Date.now() - startTime;
        traceEntry.duration = duration;

        logSlowRequest(req.method, req.originalUrl || req.url, duration, res.statusCode, {
          reqId,
          traceId: store.traceId,
        });

        if (res.statusCode >= 500) {
          trackError(new Error(`HTTP ${res.statusCode}`), {
            reqId,
            traceId: store.traceId,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
          });
        }

        if (activeTraces.size > 500) {
          const oldestKey = activeTraces.keys().next().value;
          activeTraces.delete(oldestKey);
        }

        span.setAttribute('http.status_code', res.statusCode);
        span.setAttribute('http.response_time_ms', duration);

        if (res.statusCode >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        span.end();

        originalEnd.apply(this, args);
      };

      next();
    });
  });
}

export function trackQuery(query, meta = {}) {
  const tracker = queryTracker.track(query, meta);
  return {
    end: (error = null) => tracker.end(error),
  };
}

export function getActiveTraceInfo(reqId) {
  return activeTraces.get(reqId) || null;
}

export function getAllActiveTraces() {
  return Array.from(activeTraces.values());
}
