/**
 * eventConflicts.js
 * Utilities for detecting scheduling conflicts between events.
 */

/**
 * Parse a date string (ISO, YYYY-MM-DD, or natural language) into a Date.
 * Returns null if unparseable.
 */
export function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

/**
 * Get start/end Date for an event.
 * Falls back to same-day if only one boundary is present.
 */
export function getEventBounds(event) {
  const start = parseEventDate(event.startDate ?? event.date);
  const end = parseEventDate(event.endDate ?? event.startDate ?? event.date);
  return { start, end };
}

/**
 * isOverlapping(eventA, eventB)
 * Returns true if two events have overlapping time ranges on the same day.
 */
export function isOverlapping(eventA, eventB) {
  const a = getEventBounds(eventA);
  const b = getEventBounds(eventB);
  if (!a.start || !b.start) return false;

  // Must be the same calendar day to conflict
  const sameDay =
    a.start.toDateString() === b.start.toDateString() ||
    a.start.toDateString() === b.end?.toDateString() ||
    a.end?.toDateString() === b.start.toDateString();

  if (!sameDay) return false;

  // Time-based overlap: [a.start, a.end] ∩ [b.start, b.end] ≠ ∅
  const aEnd = a.end ?? new Date(a.start.getTime() + 2 * 60 * 60 * 1000); // default 2h
  const bEnd = b.end ?? new Date(b.start.getTime() + 2 * 60 * 60 * 1000);

  return a.start < bEnd && aEnd > b.start;
}

/**
 * getConflictSeverity(eventA, eventB)
 * Returns:
 *   'conflict' — direct time overlap
 *   'warning'  — same day, within 30 minutes of each other
 *   'none'     — no conflict
 */
export function getConflictSeverity(eventA, eventB) {
  if (isOverlapping(eventA, eventB)) return 'conflict';

  const a = getEventBounds(eventA);
  const b = getEventBounds(eventB);
  if (!a.start || !b.start) return 'none';

  const sameDay = a.start.toDateString() === b.start.toDateString();
  if (!sameDay) return 'none';

  const aEnd = a.end ?? new Date(a.start.getTime() + 2 * 60 * 60 * 1000);
  const bEnd = b.end ?? new Date(b.start.getTime() + 2 * 60 * 60 * 1000);
  const THIRTY_MIN = 30 * 60 * 1000;

  const gap = Math.max(a.start.getTime() - bEnd.getTime(), b.start.getTime() - aEnd.getTime(), 0);

  return gap <= THIRTY_MIN ? 'warning' : 'none';
}

/**
 * detectConflicts(events)
 * Returns an array of conflict objects: { eventA, eventB, severity }
 * Only includes pairs with severity !== 'none'.
 */
export function detectConflicts(events) {
  const conflicts = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const severity = getConflictSeverity(events[i], events[j]);
      if (severity !== 'none') {
        conflicts.push({ eventA: events[i], eventB: events[j], severity });
      }
    }
  }
  return conflicts;
}

/**
 * getEventConflictStatus(event, allEvents)
 * Returns the worst conflict severity for a single event against all others.
 */
export function getEventConflictStatus(event, allEvents) {
  let worst = 'none';
  for (const other of allEvents) {
    if (other.id === event.id) continue;
    const s = getConflictSeverity(event, other);
    if (s === 'conflict') return 'conflict';
    if (s === 'warning') worst = 'warning';
  }
  return worst;
}
