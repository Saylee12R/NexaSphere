import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Skeleton } from '../components/Skeleton';
import { AdminIcon } from '../components/AdminIcon';
import { DashboardCardSkeleton } from '../components/DashboardCardSkeleton';

export function UserEngagementReport() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.reports.getEngagement();
        const fetchedUsers = data?.users || [];
        setUsers(fetchedUsers);

        // Calculate summary stats
        const totalUsers = fetchedUsers.length;
        const activeUsers = fetchedUsers.filter((u) => u.status === 'Active');
        const inactiveUsers = fetchedUsers.filter((u) => u.status === 'Inactive');
        const totalScore = fetchedUsers.reduce((sum, u) => sum + u.engagementScore, 0);

        setStats({
          totalActive: activeUsers.length,
          totalInactive: inactiveUsers.length,
          averageScore: totalUsers ? Math.round(totalScore / totalUsers) : 0,
          mostActiveCount: fetchedUsers.filter((u) => u.engagementScore >= 80).length,
        });
      } catch (e) {
        console.error('Failed to load engagement data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">User Engagement Report</h2>
        <p className="page-subtitle" style={{ marginTop: '0.5rem' }}>
          Dashboard showing the most and least active users based on events, portfolio, and
          activity.
        </p>
      </div>

      {loading ? (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
      ) : stats ? (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <span className="stat-icon">
              <AdminIcon name="Users" size={28} aria-hidden="true" />
            </span>
            <div>
              <div className="stat-value">{stats.totalActive}</div>
              <div className="stat-label">Active Users</div>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <AdminIcon name="Target" size={28} aria-hidden="true" />
            </span>
            <div>
              <div className="stat-value">{stats.averageScore}</div>
              <div className="stat-label">Avg Engagement Score</div>
            </div>
          </div>
          <div className="stat-card">
            <span
              className="stat-icon"
              style={{ color: 'var(--admin-accent)', background: 'rgba(204,17,17,0.1)' }}
            >
              <AdminIcon name="Award" size={28} aria-hidden="true" />
            </span>
            <div>
              <div className="stat-value">{stats.mostActiveCount}</div>
              <div className="stat-label">Most Active (Score ≥ 80)</div>
            </div>
          </div>
          <div className="stat-card">
            <span
              className="stat-icon"
              style={{ color: '#888', background: 'rgba(255,255,255,0.05)' }}
            >
              <AdminIcon name="Users" size={28} aria-hidden="true" />
            </span>
            <div>
              <div className="stat-value">{stats.totalInactive}</div>
              <div className="stat-label">Inactive Users</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Engagement Details</h3>
          <p className="page-subtitle" style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
            <strong>Scoring Logic:</strong> 40% active days (30d), 30% events attended, 30%
            portfolio completion.
            <br />
            <strong>Inactive Logic:</strong> Less than 2 active days in the last 30 days and 0
            events attended.
          </p>
        </div>
        <div className="card-content" style={{ overflowX: 'auto' }}>
          {loading ? (
            <Skeleton height={40} count={5} />
          ) : users.length === 0 ? (
            <div className="empty-state">No engagement data found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Events Attended</th>
                  <th>Portfolio %</th>
                  <th>Active Days (30d)</th>
                  <th>Active Days (90d)</th>
                  <th>Engagement Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td>{user.eventsAttended}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.1)',
                            height: '6px',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${user.portfolioCompletion}%`,
                              background: 'var(--admin-accent)',
                              height: '100%',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem' }}>{user.portfolioCompletion}%</span>
                      </div>
                    </td>
                    <td>{user.activeDays30}</td>
                    <td>{user.activeDays90}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor:
                            user.engagementScore >= 80
                              ? 'rgba(34, 197, 94, 0.15)'
                              : user.engagementScore >= 40
                                ? 'rgba(234, 179, 8, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                          color:
                            user.engagementScore >= 80
                              ? '#4ade80'
                              : user.engagementScore >= 40
                                ? '#facc15'
                                : '#f87171',
                        }}
                      >
                        {user.engagementScore}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color:
                            user.status === 'Active'
                              ? 'var(--admin-text)'
                              : 'var(--admin-text-muted)',
                          opacity: user.status === 'Active' ? 1 : 0.6,
                        }}
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
