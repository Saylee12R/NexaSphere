let listings = [];
let sessions = [];
let feedback = [];
let leaderboard = new Map();

export const skillExchangeService = {
  createListing(data) {
    const listing = { id: `lst-${Date.now()}`, ...data, createdAt: new Date().toISOString() };
    listings.push(listing);
    return listing;
  },

  getListings(filters = {}) {
    let result = [...listings];
    if (filters.teach)
      result = result.filter((l) => l.teach.toLowerCase().includes(filters.teach.toLowerCase()));
    if (filters.learn)
      result = result.filter((l) => l.learn.toLowerCase().includes(filters.learn.toLowerCase()));
    if (filters.user) result = result.filter((l) => l.user === filters.user);
    return result.slice(0, 100);
  },

  findMatches(listingId) {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return [];
    return listings
      .filter((l) => l.id !== listingId && l.user !== listing.user)
      .filter(
        (l) =>
          l.teach.toLowerCase() === listing.learn.toLowerCase() &&
          l.learn.toLowerCase() === listing.teach.toLowerCase()
      )
      .map((l) => ({ ...l, matchType: 'win-win', matchScore: 100 }));
  },

  bookSession(fromUser, toUser, listingId, scheduledAt) {
    const session = {
      id: `sess-${Date.now()}`,
      fromUser,
      toUser,
      listingId,
      scheduledAt,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    return session;
  },

  completeSession(sessionId, notes) {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    session.status = 'completed';
    session.notes = notes;
    session.completedAt = new Date().toISOString();
    [session.fromUser, session.toUser].forEach((u) => {
      const entry = leaderboard.get(u) || { sessions: 0, xp: 0, streak: 0, lastActive: null };
      entry.sessions++;
      entry.xp += 10;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (entry.lastActive && entry.lastActive > weekAgo) entry.streak++;
      else entry.streak = 1;
      entry.lastActive = now;
      leaderboard.set(u, entry);
    });
    return session;
  },

  leaveFeedback(sessionId, from, to, rating, comment) {
    const fb = {
      id: `fb-${Date.now()}`,
      sessionId,
      from,
      to,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    feedback.push(fb);
    return fb;
  },

  getFeedback(sessionId) {
    return feedback.filter((f) => f.sessionId === sessionId);
  },

  getLeaderboard() {
    return Array.from(leaderboard.entries())
      .map(([user, stats]) => ({ user, ...stats }))
      .sort((a, b) => b.xp - a.xp);
  },

  getUserStats(user) {
    const myListings = listings.filter((l) => l.user === user);
    const mySessions = sessions.filter((s) => s.fromUser === user || s.toUser === user);
    const myFeedback = feedback.filter((f) => f.from === user || f.to === user);
    const stats = leaderboard.get(user) || { sessions: 0, xp: 0, streak: 0 };
    return { listings: myListings, sessions: mySessions, feedback: myFeedback, stats };
  },
};
