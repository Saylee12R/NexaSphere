/**
 * Simple notification batching utility for digest payloads.
 * Groups multiple notification objects into a single digest presentation.
 */

export function createDigestPayload(userId, items = [], frequency = 'hourly') {
  // Keep it simple: build a title and an items array
  const title = frequency === 'daily' ? 'Daily Digest' : 'Notification Digest';
  const summary = `${items.length} new items`;
  const bodyItems = items.map((it) => ({ id: it.id, title: it.title, message: it.message }));

  return {
    userId,
    title: `${title} — ${summary}`,
    body: bodyItems.map((i) => `• ${i.title}: ${i.message}`).join('\n'),
    items: bodyItems,
    createdAt: new Date().toISOString(),
  };
}

export default { createDigestPayload };
