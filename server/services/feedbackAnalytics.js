/**
 * feedbackAnalytics.js
 * NPS calculation, theme extraction, and trend analysis.
 */

/**
 * Classify a raw NPS response (0–10) into detractor / passive / promoter.
 */
function classifyNPS(score) {
  if (score <= 6) return 'detractor';
  if (score <= 8) return 'passive';
  return 'promoter';
}

/**
 * Calculate NPS score from an array of 0–10 scores.
 * NPS = % Promoters − % Detractors (range −100 to +100)
 */
function calculateNPS(scores) {
  if (!scores.length) return { score: null, promoters: 0, passives: 0, detractors: 0 };

  let promoters = 0,
    passives = 0,
    detractors = 0;
  scores.forEach((s) => {
    const cat = classifyNPS(s);
    if (cat === 'promoter') promoters++;
    else if (cat === 'passive') passives++;
    else detractors++;
  });

  const total = scores.length;
  const score = Math.round(((promoters - detractors) / total) * 100);
  return {
    score,
    promoters: Math.round((promoters / total) * 100),
    passives: Math.round((passives / total) * 100),
    detractors: Math.round((detractors / total) * 100),
    total,
  };
}

/**
 * Lightweight keyword-based theme extraction.
 * Returns top 5 positive and negative themes from open-ended text.
 * In production, swap with an LLM call for richer analysis.
 */
const POSITIVE_SIGNALS = [
  'great',
  'excellent',
  'loved',
  'amazing',
  'helpful',
  'well organized',
  'engaging',
  'informative',
  'enjoyed',
  'fantastic',
  'good',
  'nice',
  'smooth',
  'clear',
  'fun',
  'interesting',
  'valuable',
  'professional',
];

const NEGATIVE_SIGNALS = [
  'slow',
  'confusing',
  'boring',
  'poor audio',
  'technical issues',
  'disorganized',
  'too long',
  'lack of',
  'missing',
  'difficult',
  'unclear',
  'late',
  'rushed',
  'crowded',
  'hard to follow',
];

function analyzeThemes(texts) {
  const combined = texts.join(' ').toLowerCase();
  const words = combined.split(/\s+/);

  const positiveHits = {};
  POSITIVE_SIGNALS.forEach((signal) => {
    const count = (combined.match(new RegExp(signal, 'g')) || []).length;
    if (count > 0) positiveHits[signal] = count;
  });

  const negativeHits = {};
  NEGATIVE_SIGNALS.forEach((signal) => {
    const count = (combined.match(new RegExp(signal, 'g')) || []).length;
    if (count > 0) negativeHits[signal] = count;
  });

  const topPositive = Object.entries(positiveHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => `${theme} (${count})`);

  const topNegative = Object.entries(negativeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => `${theme} (${count})`);

  return { positive: topPositive, negative: topNegative };
}

/**
 * Calculate average ratings across all dimensions.
 */
function averageRatings(feedbacks) {
  const dims = ['overall', 'content', 'speaker', 'venue', 'logistics', 'networking', 'value'];
  const result = {};
  dims.forEach((d) => {
    const vals = feedbacks.map((f) => f[`rating_${d}`]).filter((v) => v != null);
    result[d] = vals.length
      ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
      : null;
  });
  return result;
}

/**
 * Build star distribution histogram for overall ratings.
 */
function buildDistribution(feedbacks) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  feedbacks.forEach((f) => {
    if (f.rating_overall >= 1 && f.rating_overall <= 5) dist[f.rating_overall]++;
  });
  return dist;
}

/**
 * Calculate NPS trend over the last N events for benchmarking.
 */
async function npsTrend(db, organizerId, limit = 6) {
  const events = await db('events')
    .where({ organizer_id: organizerId })
    .orderBy('start_time', 'desc')
    .limit(limit);

  const trend = await Promise.all(
    events.map(async (ev) => {
      const scores = await db('feedback')
        .where({ event_id: ev.id })
        .whereNotNull('nps_score')
        .pluck('nps_score');
      return { eventTitle: ev.title, date: ev.start_time, ...calculateNPS(scores) };
    })
  );
  return trend.reverse();
}

module.exports = {
  classifyNPS,
  calculateNPS,
  analyzeThemes,
  averageRatings,
  buildDistribution,
  npsTrend,
};
