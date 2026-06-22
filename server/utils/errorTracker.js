import crypto from 'crypto';
import logger from './logger.js';

const errorGroups = new Map();
const ERROR_GROUP_TTL_MS = 24 * 60 * 60 * 1000;

function generateErrorFingerprint(error) {
  const message = error.message || 'Unknown error';
  const stack = error.stack || '';
  const stackLines = stack.split('\n').slice(0, 5).join('|');
  const hash = crypto
    .createHash('md5')
    .update(`${error.name}:${message}:${stackLines}`)
    .digest('hex');
  return hash;
}

function cleanOldErrorGroups() {
  const now = Date.now();
  for (const [fingerprint, group] of errorGroups.entries()) {
    if (now - group.lastSeen > ERROR_GROUP_TTL_MS) {
      errorGroups.delete(fingerprint);
    }
  }
}

export function trackError(error, context = {}) {
  const fingerprint = generateErrorFingerprint(error);
  const now = Date.now();

  if (!errorGroups.has(fingerprint)) {
    errorGroups.set(fingerprint, {
      fingerprint,
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      firstSeen: now,
      lastSeen: now,
      count: 1,
      contexts: [],
    });
  }

  const group = errorGroups.get(fingerprint);
  group.lastSeen = now;
  group.count++;

  if (group.contexts.length < 10) {
    group.contexts.push({
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  logger.error('Error tracked', {
    errorFingerprint: fingerprint,
    errorName: error.name,
    errorMessage: error.message,
    errorCount: group.count,
    stack: error.stack,
    ...context,
  });

  if (group.count > 10) {
    logger.fatal('Critical: High frequency error detected', {
      errorFingerprint: fingerprint,
      errorName: error.name,
      errorMessage: error.message,
      errorCount: group.count,
      timeWindow: '24h',
    });
  }

  return fingerprint;
}

export function getErrorGroup(fingerprint) {
  cleanOldErrorGroups();
  return errorGroups.get(fingerprint) || null;
}

export function getAllErrorGroups() {
  cleanOldErrorGroups();
  return Array.from(errorGroups.values()).sort((a, b) => b.count - a.count);
}

export function getErrorStats() {
  cleanOldErrorGroups();
  const groups = Array.from(errorGroups.values());
  return {
    totalGroups: groups.length,
    totalErrors: groups.reduce((sum, g) => sum + g.count, 0),
    topErrors: groups.slice(0, 10),
  };
}
