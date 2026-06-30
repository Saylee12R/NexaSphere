import React, { useState, useEffect } from 'react';
import InterestSelector from '../../components/dashboard/InterestSelector';
import QuestTracker from '../../components/dashboard/QuestTracker';
import Leaderboard from '../../components/dashboard/Leaderboard';
import AiMentor from '../../components/dashboard/AiMentor';
import SlackSettings from '../../components/dashboard/SlackSettings';
import { DashboardCardSkeleton } from '../../components/ui/skeleton/DashboardCardSkeleton';
import { buildUrl, getAiApiBase, getApiBase } from '../../utils/runtimeConfig';
import { useTheme } from '../../hooks/useTheme';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { STORAGE_KEYS } from '../../utils/storageKeys';

export default function DashboardPage({ onBack }) {
  const { user: authUser } = useStudentAuth();
  const { theme: currentTheme, setTheme } = useTheme();
  const currentUser = authUser
    ? {
        id: authUser.sub || authUser.id,
        name: authUser.name || 'Explorer',
        email: authUser.email || '',
        role: authUser.role || 'student',
      }
    : { id: 'user_123', name: 'Explorer', email: '', role: 'student' };
  const [interests, setInterests] = useState([]);
  const [quests, setQuests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // No quest/leaderboard endpoints exist on the backend yet.
  // These are seeded with static data until the backend implements
  // /api/dashboard/quests and /api/dashboard/leaderboard.
  const isDemoMode = !getApiBase();

  useEffect(() => {
    setQuests([
      {
        id: 'q1',
        title: 'Complete AI Review',
        description: 'Submit code to the AI Mentor.',
        xpReward: 100,
        completed: false,
      },
      {
        id: 'q2',
        title: 'Select Interests',
        description: 'Choose at least 3 tech interests.',
        xpReward: 50,
        completed: false,
      },
    ]);

    setLeaderboard(
      [
        {
          id: 'u1',
          userId: 'user_123',
          username: 'Explorer',
          xp: 450,
          level: 3,
        },
        {
          id: 'u2',
          userId: 'user_456',
          username: 'TechNinja',
          xp: 850,
          level: 5,
        },
        {
          id: 'u3',
          userId: 'user_789',
          username: 'CodeMaster',
          xp: 320,
          level: 2,
        },
      ].sort((a, b) => b.xp - a.xp || a.username.localeCompare(b.username))
    );
  }, [currentUser]);

  const toggleInterest = (domain) => {
    setInterests((prev) => {
      const newInterests = prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain];

      // Quest trigger
      if (newInterests.length >= 3) {
        completeQuest('q2');
      }
      return newInterests;
    });
  };

  const completeQuest = (questId) => {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, completed: true } : q)));
  };

  const fetchRecommendations = async () => {
    if (interests.length === 0) return;
    setLoadingRecs(true);
    try {
      const recommendationsUrl = buildUrl(getAiApiBase(), `/recommend/events/${currentUser.id}`);
      if (!recommendationsUrl) {
        throw new Error('Recommendations service is not configured');
      }

      const res = await fetch(recommendationsUrl);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommended_events || []);
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('[DashboardPage] Failed to fetch recommendations:', e.message);
      }
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations();
    }, 1000);
    return () => clearTimeout(timer);
  }, [interests]);

  return (
    <div
      className="dashboard-page"
      style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        color: 'var(--t1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            background: 'linear-gradient(90deg, #fff, var(--c1))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome back, {currentUser.name}
        </h1>
        {onBack && (
          <button
            onClick={onBack}
            className="btn"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--b2)',
              color: 'var(--t1)',
            }}
          >
            Home
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              background: 'var(--bg-glass)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--b2)',
            }}
          >
            <InterestSelector selectedInterests={interests} onToggleInterest={toggleInterest} />
          </div>

          <div
            style={{
              background: 'var(--bg-glass)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--b2)',
            }}
          >
            <h3
              style={{
                marginBottom: '12px',
                color: 'var(--t1)',
                fontFamily: 'Orbitron, sans-serif',
              }}
            >
              Theme Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>
                Choose your appearance preference:
              </span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => setTheme('light')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: currentTheme === 'light' ? 'var(--c1)' : 'rgba(255,255,255,0.04)',
                    color: currentTheme === 'light' ? '#fff' : 'var(--t1)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: currentTheme === 'light' ? '700' : '500',
                  }}
                  onMouseOver={(e) => {
                    if (currentTheme !== 'light')
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (currentTheme !== 'light')
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: currentTheme === 'dark' ? 'var(--c1)' : 'rgba(255,255,255,0.04)',
                    color: currentTheme === 'dark' ? '#fff' : 'var(--t1)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: currentTheme === 'dark' ? '700' : '500',
                  }}
                  onMouseOver={(e) => {
                    if (currentTheme !== 'dark')
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (currentTheme !== 'dark')
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('system')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: currentTheme === 'system' ? 'var(--c1)' : 'rgba(255,255,255,0.04)',
                    color: currentTheme === 'system' ? '#fff' : 'var(--t1)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: currentTheme === 'system' ? '700' : '500',
                  }}
                  onMouseOver={(e) => {
                    if (currentTheme !== 'system')
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (currentTheme !== 'system')
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                >
                  System
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-glass)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid var(--b2)',
            }}
          >
            <h3 style={{ marginBottom: '16px', color: 'var(--t1)' }}>
              Personalized Recommendations
            </h3>
            {interests.length === 0 ? (
              <p style={{ color: 'var(--t2)' }}>
                Select some interests above to see recommendations!
              </p>
            ) : loadingRecs ? (
              <DashboardCardSkeleton count={3} />
            ) : recommendations.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {recommendations.map((rec, i) => (
                  <div
                    key={rec.id ?? rec.title ?? i}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--c1-50)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: 'var(--c1)' }}>
                      {rec.title || 'Event'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>
                      Match Score: {Math.round((rec.score || 0.8) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--t2)' }}>
                No new recommendations based on your current interests.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isDemoMode && (
            <p style={{ color: '#f59e0b', fontSize: '0.8rem', marginBottom: '8px' }}>
              ⚠ Demo mode — quests and leaderboard show sample data until the backend is connected.
            </p>
          )}
          <QuestTracker quests={quests} onCompleteQuest={completeQuest} />
          <Leaderboard users={leaderboard} currentUserId={currentUser.id} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <AiMentor />
        </div>
      </div>

      <SlackSettings currentUser={currentUser} authUser={authUser} />
    </div>
  );
}
