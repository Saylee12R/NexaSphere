/**
 * Centralized localStorage / sessionStorage key constants.
 *
 * All reads and writes to browser storage MUST use these constants
 * to prevent key-string drift across files (bug: syncManager was
 * using 'ns-auth-token' while StudentAuthContext wrote 'ns_student_token').
 *
 * Security note: auth tokens stored in localStorage are readable by
 * any JS on the page. Long-term goal: migrate to httpOnly cookies.
 * For now, using this central registry ensures consistent handling.
 */
export const STORAGE_KEYS = {
  /** JWT issued by /api/auth — used as Bearer token in API requests. */
  AUTH_TOKEN: 'ns_student_token',

  /** Serialized user profile { id, email, name } */
  USER_PROFILE: 'ns_user',

  /** App colour theme preference: 'light' | 'dark' | 'system' */
  THEME: 'ns-theme',

  /** Last 5 search queries for the search bar autocomplete. */
  RECENT_SEARCHES: 'recent_searches',

  /** Saved search configurations (query + filters + timestamp). */
  SAVED_SEARCHES: 'saved_searches',

  /** Moderation flagged content cache (admin review queue). */
  MODERATION_FLAGGED: 'moderation_flagged',
};

export default STORAGE_KEYS;
