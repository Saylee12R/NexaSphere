import React, { useState, useEffect } from 'react';
import InterestSelector from '../../components/dashboard/InterestSelector';
import QuestTracker from '../../components/dashboard/QuestTracker';
import Leaderboard from '../../components/dashboard/Leaderboard';
import AiMentor from '../../components/dashboard/AiMentor';
import { buildUrl, getAiApiBase, getApiBase } from '../../utils/runtimeConfig';
import { useTheme } from '../../hooks/useTheme';

function DashboardCardSkeleton({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        >
          <div
            style={{
              height: '16px',
              width: '60%',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              height: '12px',
              width: '40%',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage({ onBack }) {
  const { user: authUser } = useStudentAuth();
  const currentUser = authUser
    ? {
        id: authUser.sub || authUser.id,
        name: authUser.name || 'Explorer',
        email: authUser.email || '',
        role: authUser.role || 'student',
      }
    : { id: 'user_123', name: 'Explorer', email: '', role: 'student' };

  const [slackUserId, setSlackUserId] = useState('');
  const [slackDmReminders, setSlackDmReminders] = useState(false);
  const [globalSlackConfig, setGlobalSlackConfig] = useState({
    connected: false,
    channel_name: '',
    channel_id: '',
    notify_new_events: true,
    notify_registrations: true,
    notify_announcements: true,
  });

  const [slackSuccess, setSlackSuccess] = useState(false);
  const [slackError, setSlackError] = useState(null);
  const [savingSlackSettings, setSavingSlackSettings] = useState(false);
  const [savingGlobalSlack, setSavingGlobalSlack] = useState(false);
  const [disconnectingSlack, setDisconnectingSlack] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    if (authUser) {
      setSlackUserId(authUser.slack_user_id || '');
      setSlackDmReminders(!!authUser.slack_dm_reminders);
    }
  }, [authUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack_success') === 'true') {
      setSlackSuccess(true);
      params.delete('slack_success');
      const cleanUrl =
        window.location.pathname +
        (params.toString() ? '?' + params.toString() : '') +
        window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
    const err = params.get('slack_error');
    if (err) {
      setSlackError(err);
      params.delete('slack_error');
      const cleanUrl =
        window.location.pathname +
        (params.toString() ? '?' + params.toString() : '') +
        window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  const fetchGlobalSlackConfig = async () => {
    if (!isAdmin) return;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/admin/slack/config`, {
        credentials: 'include',
      });
      if (res.ok) {
        const config = await res.json();
        setGlobalSlackConfig(config);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching global Slack config:', err);
    }
  };

  useEffect(() => {
    fetchGlobalSlackConfig();
  }, [authUser]);

  const handleSaveStudentSlack = async () => {
    setSavingSlackSettings(true);
    try {
      const base = getApiBase();
      const token = localStorage.getItem('ns_student_token');
      const res = await fetch(`${base}/api/auth/slack-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slackUserId,
          slackDmReminders,
        }),
      });
      if (res.ok) {
        alert('Slack DM preferences saved successfully!');
      } else {
        alert('Failed to save Slack settings.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving Slack settings.');
    } finally {
      setSavingSlackSettings(false);
    }
  };

  const handleSaveGlobalSlack = async () => {
    setSavingGlobalSlack(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/admin/slack/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notify_new_events: globalSlackConfig.notify_new_events,
          notify_registrations: globalSlackConfig.notify_registrations,
          notify_announcements: globalSlackConfig.notify_announcements,
        }),
        credentials: 'include',
      });
      if (res.ok) {
        alert('Workspace Slack notification settings updated!');
        fetchGlobalSlackConfig();
      } else {
        alert('Failed to update workspace Slack settings.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating workspace settings.');
    } finally {
      setSavingGlobalSlack(false);
    }
  };

  const handleDisconnectSlack = async () => {
    if (!confirm('Are you sure you want to disconnect Slack from this workspace?')) return;
    setDisconnectingSlack(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/admin/slack/disconnect`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        alert('Slack successfully disconnected!');
        fetchGlobalSlackConfig();
      } else {
        alert('Failed to disconnect Slack.');
      }
    } catch (e) {
      console.error(e);
      alert('Error disconnecting Slack.');
    } finally {
      setDisconnectingSlack(false);
    }
  };

  const handleConnectSlack = () => {
    const base = getApiBase();
    window.location.href = `${base}/api/slack/auth`;
  };

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
      ].sort((a, b) => b.xp - a.xp)
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
            <h3 style={{ marginBottom: '12px', color: 'var(--t1)', fontFamily: 'Orbitron, sans-serif' }}>
              Theme Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>Choose your appearance preference:</span>
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
                    if (currentTheme !== 'light') e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (currentTheme !== 'light') e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
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
                    if (currentTheme !== 'dark') e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (currentTheme !== 'dark') e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
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
                    if (currentTheme !== 'system') e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (currentTheme !== 'system') e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
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

      {/* Slack settings & integration */}
      <div
        style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '28px',
          borderRadius: '16px',
          border: '1px solid var(--b2)',
          marginTop: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <svg style={{ width: '28px', height: '28px', fill: 'var(--c1)' }} viewBox="0 0 24 24">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52v2.522h-2.522zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H3.78a2.528 2.528 0 0 1-2.52-2.52V8.824a2.528 2.528 0 0 1 2.52-2.52h5.043zm6.354 3.779a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52H6.354a2.528 2.528 0 0 1-2.52-2.52V5.043a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-5.092 10.138a2.528 2.528 0 0 1 2.52 2.522 2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1-2.522-2.52v-2.522h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52-2.52H8.823z" />
          </svg>
          <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>
            Slack Settings & Integrations
          </h2>
        </div>

        {/* Success/Error Banners */}
        {slackSuccess && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#34d399',
              fontSize: '0.9rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🎉 <strong>Success:</strong> Slack workspace integrated successfully!
          </div>
        )}
        {slackError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '0.9rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ⚠️ <strong>Error:</strong> Failed to connect Slack: {slackError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
          }}
        >
          {/* Student/User settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3
              style={{
                fontSize: '1.15rem',
                color: 'var(--c1)',
                margin: '0 0 8px 0',
                borderBottom: '1px solid var(--b2)',
                paddingBottom: '8px',
              }}
            >
              Personal DM Reminders
            </h3>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input
                id="slack-dm-reminders"
                type="checkbox"
                checked={slackDmReminders}
                onChange={(e) => setSlackDmReminders(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--c1)',
                  marginTop: '4px',
                }}
              />
              <label
                htmlFor="slack-dm-reminders"
                style={{
                  color: 'var(--t1)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  lineHeight: '1.4',
                }}
              >
                <strong>Enable Slack Direct Messages</strong>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--t2)',
                    fontSize: '0.85rem',
                    marginTop: '2px',
                  }}
                >
                  Receive private DM reminders for upcoming events and deadline updates.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor="slack-user-id"
                style={{ color: 'var(--t1)', fontSize: '0.9rem', fontWeight: 'bold' }}
              >
                Slack User ID (Optional)
              </label>
              <input
                id="slack-user-id"
                type="text"
                placeholder="e.g. U12345678"
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--b2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--c1)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--b2)')}
              />
              <span style={{ color: 'var(--t2)', fontSize: '0.8rem' }}>
                Leave empty to automatically match using your NexaSphere email.
              </span>
            </div>

            <button
              onClick={handleSaveStudentSlack}
              disabled={savingSlackSettings}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                padding: '10px 20px',
                background: 'var(--c1)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: savingSlackSettings ? 0.7 : 1,
                transition: 'background 0.2s',
              }}
            >
              {savingSlackSettings ? 'Saving...' : 'Save DM Preferences'}
            </button>
          </div>

          {/* Admin workspace settings */}
          {isAdmin && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                borderLeft: '1px solid var(--b2)',
                paddingLeft: '32px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.15rem',
                  color: 'var(--c1)',
                  margin: '0 0 8px 0',
                  borderBottom: '1px solid var(--b2)',
                  paddingBottom: '8px',
                }}
              >
                Workspace Integration (Admin)
              </h3>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--b2)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--t2)' }}>
                    Status
                  </span>
                  <strong
                    style={{
                      color: globalSlackConfig.connected ? '#10b981' : '#ef4444',
                      fontSize: '0.95rem',
                    }}
                  >
                    {globalSlackConfig.connected
                      ? `Connected to #${globalSlackConfig.channel_name || 'slack'}`
                      : 'Disconnected'}
                  </strong>
                </div>

                {globalSlackConfig.connected ? (
                  <button
                    onClick={handleDisconnectSlack}
                    disabled={disconnectingSlack}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      color: '#f87171',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {disconnectingSlack ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectSlack}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background: '#fff',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Add to Slack
                  </button>
                )}
              </div>

              {globalSlackConfig.connected && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--t1)' }}>
                      Notify in Slack Channel on:
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        id="notify-events"
                        type="checkbox"
                        checked={globalSlackConfig.notify_new_events}
                        onChange={(e) =>
                          setGlobalSlackConfig({
                            ...globalSlackConfig,
                            notify_new_events: e.target.checked,
                          })
                        }
                        style={{ accentColor: 'var(--c1)', width: '16px', height: '16px' }}
                      />
                      <label
                        htmlFor="notify-events"
                        style={{ color: 'var(--t1)', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        New Events Published
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        id="notify-registrations"
                        type="checkbox"
                        checked={globalSlackConfig.notify_registrations}
                        onChange={(e) =>
                          setGlobalSlackConfig({
                            ...globalSlackConfig,
                            notify_registrations: e.target.checked,
                          })
                        }
                        style={{ accentColor: 'var(--c1)', width: '16px', height: '16px' }}
                      />
                      <label
                        htmlFor="notify-registrations"
                        style={{ color: 'var(--t1)', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        New Registrations Confirmed
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        id="notify-announcements"
                        type="checkbox"
                        checked={globalSlackConfig.notify_announcements}
                        onChange={(e) =>
                          setGlobalSlackConfig({
                            ...globalSlackConfig,
                            notify_announcements: e.target.checked,
                          })
                        }
                        style={{ accentColor: 'var(--c1)', width: '16px', height: '16px' }}
                      />
                      <label
                        htmlFor="notify-announcements"
                        style={{ color: 'var(--t1)', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        Admin Announcements
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveGlobalSlack}
                    disabled={savingGlobalSlack}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '8px 16px',
                      border: '1px solid var(--c1)',
                      color: 'var(--c1)',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      background: 'transparent',
                      opacity: savingGlobalSlack ? 0.7 : 1,
                    }}
                  >
                    {savingGlobalSlack ? 'Saving...' : 'Save Workspace Toggles'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
