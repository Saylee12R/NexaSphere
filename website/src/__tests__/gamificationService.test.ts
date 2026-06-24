import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  gamificationService,
  ACHIEVEMENTS,
  XP_VALUES,
  LEVEL_THRESHOLDS,
} from '../services/gamification/gamificationService';

describe('GamificationService', () => {
  beforeEach(() => {
    // Clear localStorage and reset state before each test
    localStorage.clear();
    // Re-initialize the service user data to defaults
    gamificationService.userData = gamificationService.loadUserData();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default values when no data is stored', () => {
    const stats = gamificationService.getUserStats();
    expect(stats.xp).toBe(0);
    expect(stats.level).toBe(1);
    expect(stats.title).toBe('Newcomer');
    expect(stats.achievements).toEqual([]);
    expect(stats.badges).toEqual([]);
    expect(stats.stats.events_attended).toBe(0);
  });

  it('calculates current and next level XP thresholds correctly', () => {
    // Level 1: current is 0, next is 500
    expect(gamificationService.getCurrentLevelXP()).toBe(0);
    expect(gamificationService.getNextLevelXP()).toBe(500);

    // Let's add XP to level 2
    gamificationService.addXP(600);
    expect(gamificationService.userData.level).toBe(2);
    // Level 2: current is 500, next is 1500
    expect(gamificationService.getCurrentLevelXP()).toBe(500);
    expect(gamificationService.getNextLevelXP()).toBe(1500);
  });

  it('tracks user actions and awards XP correctly', () => {
    const result = gamificationService.trackAction('ATTEND_EVENT');
    expect(result.xpEarned).toBe(XP_VALUES.ATTEND_EVENT);
    // 50 XP from attendance + 50 XP from "First Step" achievement = 100 XP total
    expect(result.totalXP).toBe(100);
    expect(gamificationService.userData.stats.events_attended).toBe(1);
  });

  it('transitions user levels when crossing thresholds', () => {
    // Add 600 XP (threshold for Level 2 is 500)
    gamificationService.addXP(600);
    expect(gamificationService.userData.level).toBe(2);
    expect(gamificationService.userData.title).toBe('Explorer');
    expect(gamificationService.userData.notifications[0].type).toBe('level_up');
  });

  it('initializes and preserves streak upon visit/load', () => {
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Pre-populate database with yesterday as last active and 2-day streak
    const initialData = {
      userId: null,
      xp: 600,
      level: 2,
      title: 'Explorer',
      achievements: [],
      stats: {
        events_attended: 1,
        events_registered: 0,
        comments: 0,
        referrals: 0,
        content_created: 0,
        feedback: 0,
        shares: 0,
        current_streak: 2,
        longest_streak: 2,
        last_active: yesterday.toDateString(),
      },
      badges: [],
      notifications: [],
    };

    localStorage.setItem('gamification_user_data', JSON.stringify(initialData));

    // Instantiating/loading data (we simulate constructor load)
    gamificationService.userData = gamificationService.loadUserData();
    gamificationService.updateStreak(); // This is run in the constructor/on visit

    expect(gamificationService.userData.stats.current_streak).toBe(3);
    expect(gamificationService.userData.stats.longest_streak).toBe(3);
    expect(gamificationService.userData.xp).toBe(600 + XP_VALUES.DAILY_STREAK);
    expect(gamificationService.userData.notifications[0].type).toBe('streak');
  });

  it('resets streak if user was inactive for more than a day', () => {
    // 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const initialData = {
      userId: null,
      xp: 600,
      level: 2,
      title: 'Explorer',
      achievements: [],
      stats: {
        events_attended: 1,
        events_registered: 0,
        comments: 0,
        referrals: 0,
        content_created: 0,
        feedback: 0,
        shares: 0,
        current_streak: 5,
        longest_streak: 5,
        last_active: threeDaysAgo.toDateString(),
      },
      badges: [],
      notifications: [],
    };

    localStorage.setItem('gamification_user_data', JSON.stringify(initialData));

    gamificationService.userData = gamificationService.loadUserData();
    gamificationService.updateStreak();

    expect(gamificationService.userData.stats.current_streak).toBe(1);
    expect(gamificationService.userData.stats.last_active).toBe(new Date().toDateString());
  });

  it('Edge Case: updates streak BEFORE checking achievements to unlock streak achievements instantly', () => {
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // User has a 2-day streak. They need 3 days for the 'On Fire' streak achievement.
    const initialData = {
      userId: null,
      xp: 0,
      level: 1,
      title: 'Newcomer',
      achievements: [],
      stats: {
        events_attended: 0,
        events_registered: 0,
        comments: 0,
        referrals: 0,
        content_created: 0,
        feedback: 0,
        shares: 0,
        current_streak: 2,
        longest_streak: 2,
        last_active: yesterday.toDateString(),
      },
      badges: [],
      notifications: [],
    };

    localStorage.setItem('gamification_user_data', JSON.stringify(initialData));

    gamificationService.userData = gamificationService.loadUserData();

    // Track action COMMENT_POSTED
    const result = gamificationService.trackAction('COMMENT_POSTED');

    // The streak should have updated to 3, and unlocked the 'On Fire' achievement immediately!
    expect(gamificationService.userData.stats.current_streak).toBe(3);

    const unlocked = result.newAchievements;
    // Unlocks both STREAK_3 and FIRST_COMMENT
    expect(unlocked.length).toBe(2);
    expect(unlocked.some((a) => a.id === 'streak_3')).toBe(true);
    expect(unlocked.some((a) => a.id === 'first_comment')).toBe(true);

    // XP awarded: comment (5) + daily streak (20) + streak achievement (30) + comment achievement (25) = 80 XP
    expect(gamificationService.userData.xp).toBe(80);
  });
});
