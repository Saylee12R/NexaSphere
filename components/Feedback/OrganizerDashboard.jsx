import { useState, useEffect, useCallback } from 'react';

const DIMENSIONS = ['overall', 'content', 'speaker', 'venue', 'logistics', 'networking', 'value'];
const DIM_LABELS = {
  overall: 'Overall',
  content: 'Content',
  speaker: 'Speaker',
  venue: 'Venue',
  logistics: 'Logistics',
  networking: 'Networking',
  value: 'Value',
};

function NPSGauge({ score }) {
  const clamped = Math.max(-100, Math.min(100, score));
  const pct = ((clamped + 100) / 200) * 100;
  const color = clamped >= 50 ? '#22c55e' : clamped >= 0 ? '#f59e0b' : '#ef4444';
  return (
    <div className="nps-gauge">
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="gauge-score" style={{ color }}>
        {clamped > 0 ? `+${clamped}` : clamped}
      </div>
      <div className="gauge-labels">
        <span>-100</span>
        <span>0</span>
        <span>+100</span>
      </div>
    </div>
  );
}

function RatingBar({ label, value }) {
  return (
    <div className="rating-bar-row">
      <span className="rb-label">{label}</span>
      <div className="rb-track">
        <div className="rb-fill" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="rb-value">{value?.toFixed(1) ?? '—'}</span>
    </div>
  );
}

function Histogram({ distribution }) {
  const max = Math.max(...Object.values(distribution), 1);
  return (
    <div className="histogram">
      {[5, 4, 3, 2, 1].map((star) => (
        <div key={star} className="hist-row">
          <span>{star}★</span>
          <div className="hist-track">
            <div
              className="hist-bar"
              style={{ width: `${((distribution[star] || 0) / max) * 100}%` }}
            />
          </div>
          <span>{distribution[star] || 0}</span>
        </div>
      ))}
    </div>
  );
}

export default function OrganizerDashboard({ eventId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(eventId || '');
  const [events, setEvents] = useState([]);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (eid) => {
    if (!eid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback/analytics/${eid}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/events/my')
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData(selectedEvent);
  }, [selectedEvent, fetchData]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/feedback/export/${selectedEvent}?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-${selectedEvent}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="organizer-dashboard">
      <div className="dash-header">
        <h2>Feedback Dashboard</h2>
        <div className="dash-controls">
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
            <option value="">Select event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <button onClick={() => handleExport('csv')} disabled={exporting || !data}>
            Export CSV
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting || !data}>
            Export PDF
          </button>
        </div>
      </div>

      {loading && <div className="dash-loading">Loading feedback data…</div>}

      {!loading && data && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{data.totalResponses}</div>
              <div className="stat-label">Total Responses</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.responseRate?.toFixed(0)}%</div>
              <div className="stat-label">Response Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.averageRatings?.overall?.toFixed(1)}</div>
              <div className="stat-label">Avg Rating</div>
            </div>
            <div className="stat-card nps-card">
              <div className="stat-label">NPS Score</div>
              <NPSGauge score={data.nps?.score ?? 0} />
              <div className="nps-breakdown">
                <span className="promoter">Promoters {data.nps?.promoters}%</span>
                <span className="passive">Passives {data.nps?.passives}%</span>
                <span className="detractor">Detractors {data.nps?.detractors}%</span>
              </div>
            </div>
          </div>

          <div className="dash-grid">
            <section className="dash-section">
              <h3>Ratings by Dimension</h3>
              {DIMENSIONS.map((d) => (
                <RatingBar key={d} label={DIM_LABELS[d]} value={data.averageRatings?.[d]} />
              ))}
            </section>

            <section className="dash-section">
              <h3>Overall Rating Distribution</h3>
              <Histogram distribution={data.distribution || {}} />
            </section>

            <section className="dash-section">
              <h3>Top Positive Themes</h3>
              <ul className="theme-list positive">
                {(data.themes?.positive || []).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </section>

            <section className="dash-section">
              <h3>Areas to Improve</h3>
              <ul className="theme-list negative">
                {(data.themes?.negative || []).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </section>

            <section className="dash-section wide">
              <h3>Recent Responses</h3>
              <div className="responses-list">
                {(data.recentResponses || []).map((r) => (
                  <div key={r.id} className="response-card">
                    <div className="response-meta">
                      <span>{r.anonymous ? 'Anonymous' : r.userName}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span>{'★'.repeat(r.ratings?.overall || 0)}</span>
                    </div>
                    {r.openEnded?.enjoyed && (
                      <p>
                        <strong>Enjoyed:</strong> {r.openEnded.enjoyed}
                      </p>
                    )}
                    {r.openEnded?.improve && (
                      <p>
                        <strong>Improve:</strong> {r.openEnded.improve}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {!loading && !data && selectedEvent && (
        <div className="dash-empty">No feedback data yet for this event.</div>
      )}
    </div>
  );
}
