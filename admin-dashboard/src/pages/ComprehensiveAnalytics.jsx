import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CustomReportBuilder } from '../components/analytics/CustomReportBuilder';

export function ComprehensiveAnalytics() {
  const [summary, setSummary] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        const [summaryRes, userRes, funnelRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE}/api/admin/analytics/summary`, { headers }),
          fetch(`${import.meta.env.VITE_API_BASE}/api/admin/analytics/users`, { headers }),
          fetch(`${import.meta.env.VITE_API_BASE}/api/admin/analytics/funnel`, { headers }),
        ]);

        const summaryData = await summaryRes.json();
        const userData = await userRes.json();
        const funnelData = await funnelRes.json();

        setSummary(summaryData.summary);
        setUserAnalytics(userData.analytics);
        setFunnel(funnelData.funnel);
      } catch (err) {
        console.error('Failed to load comprehensive analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading Analytics Dashboard...</div>;

  return (
    <div className="page bg-gray-50 text-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Analytics Dashboard</h2>
        <a
          href="/dashboard/analytics/funnel"
          style={{
            background: '#6366f1',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          🔍 Funnel Analysis
        </a>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Active Users" value={summary?.activeUsers || 0} trend="+12%" />
        <MetricCard title="Events This Month" value={summary?.eventsThisMonth || 0} trend="+3%" />
        <MetricCard
          title="Total Registrations"
          value={summary?.totalRegistrations || 0}
          trend="+24%"
        />
        <MetricCard
          title="Engagement Rate"
          value={summary?.engagementRate || 0}
          trend="-2%"
          negative
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* User Signups Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold mb-4">New Signups (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userAnalytics?.signupsByDay || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} minTickGap={30} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Funnel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold mb-4">Engagement Funnel</h3>
          <div className="space-y-4">
            {funnel?.map((step, idx) => {
              const max = Math.max(...funnel.map((s) => s.count)) || 1;
              const percent = Math.round((step.count / max) * 100);
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{step.step}</span>
                    <span className="text-gray-500">{step.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="mb-8">
        <CustomReportBuilder />
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, negative }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h4 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{title}</h4>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-extrabold text-gray-900">{value}</div>
        <div className={`text-sm font-bold ${negative ? 'text-red-500' : 'text-green-500'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}
