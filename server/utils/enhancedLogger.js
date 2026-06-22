import winston from 'winston';
import { getLogContext } from './logContext.js';
import { maskSensitiveData, createMaskingTransform } from './sensitiveDataMasking.js';
import { createSamplingTransform } from './logSampling.js';

const LOG_FORMAT = (process.env.LOG_FORMAT || 'json').toLowerCase();
const LOG_LEVEL_CONSOLE = process.env.LOG_LEVEL_CONSOLE || process.env.LOG_LEVEL || 'info';
const LOG_LEVEL_FILE = process.env.LOG_LEVEL_FILE || 'info';
const LOG_LEVEL_GLOBAL = process.env.LOG_LEVEL_GLOBAL || 'debug';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const correlationFormat = winston.format((info) => {
  const ctx = getLogContext();
  Object.assign(info, ctx);
  return info;
});

const maskingFormat = createMaskingTransform({
  customPatterns: [
    { key: /session[_-]?id/i, mask: '***' },
    { key: /cookie/i, mask: '***' },
  ],
});

const samplingFormat = createSamplingTransform({
  samplingRate: parseInt(process.env.LOG_SAMPLING_RATE, 10) || 100,
  errorSamplingRate: parseInt(process.env.ERROR_LOG_SAMPLING_RATE, 10) || 100,
});

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  correlationFormat,
  maskingFormat,
  samplingFormat,
  winston.format.json()
);

const textFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  correlationFormat,
  maskingFormat,
  samplingFormat,
  winston.format.printf((info) => {
    const { timestamp, level, message, ...args } = info;
    const ts = typeof timestamp === 'string' ? timestamp : new Date().toISOString();
    const cleanArgs = Object.keys(args).reduce((acc, key) => {
      if (typeof key === 'string' || typeof key === 'number') {
        acc[key] = args[key];
      }
      return acc;
    }, {});
    return `${ts} [${level}]: ${message} ${
      Object.keys(cleanArgs).length ? JSON.stringify(cleanArgs) : ''
    }`;
  })
);

const baseFormat = LOG_FORMAT === 'json' ? jsonFormat : textFormat;

const activeTransports = [
  new winston.transports.Console({
    level: LOG_LEVEL_CONSOLE,
    format:
      LOG_FORMAT === 'json'
        ? baseFormat
        : winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
            winston.format.errors({ stack: true }),
            winston.format.colorize({ all: true }),
            correlationFormat,
            maskingFormat,
            samplingFormat,
            winston.format.printf((info) => {
              const { timestamp, level, message, ...args } = info;
              const ts = typeof timestamp === 'string' ? timestamp : new Date().toISOString();
              const cleanArgs = Object.keys(args).reduce((acc, key) => {
                if (typeof key === 'string' || typeof key === 'number') {
                  acc[key] = args[key];
                }
                return acc;
              }, {});
              return `${ts} [${level}]: ${message} ${
                Object.keys(cleanArgs).length ? JSON.stringify(cleanArgs) : ''
              }`;
            })
          ),
  }),
];

export const enhancedLogger = winston.createLogger({
  level: LOG_LEVEL_GLOBAL,
  levels,
  format: baseFormat,
  transports: activeTransports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

export function createChildLogger(meta = {}) {
  return enhancedLogger.child(meta);
}

export function logRequest(req, res, durationMs) {
  enhancedLogger.http('HTTP Request', {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    durationMs,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
  });
}

export function logError(error, context = {}) {
  enhancedLogger.error('Error occurred', {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
    ...context,
  });
}

export default enhancedLogger;
