import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../utils/apiClient';
import './WaitlistBadge.css';

function getApiBase() {
  return (import.meta?.env?.VITE_API_BASE || '').replace(/\/+$/, '');
}

export default function WaitlistBadge({ eventId, email }) {
  const [status, setStatus] = useState('idle'); // idle | loading | onWaitlist | notOnWaitlist | error
  const [position, setPosition] = useState(null);
  const [totalWaitlisted, setTotalWaitlisted] = useState(null);
  const [leaving, setLeaving] = useState(false);

  const fetchPosition = useCallback(async () => {
    const base = getApiBase();
    if (!base || !eventId || !email) return;

    setStatus('loading');
    try {
      const url = `${base}/api/content/events/${encodeURIComponent(eventId)}/waitlist-position?email=${encodeURIComponent(email)}`;
      const data = await apiClient(url);
      setPosition(data.position);
      setTotalWaitlisted(data.totalWaitlisted);
      setStatus('onWaitlist');
    } catch (err) {
      if (err?.status === 404) {
        setStatus('notOnWaitlist');
      } else {
        setStatus('error');
      }
    }
  }, [eventId, email]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      await fetchPosition();
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchPosition]);

  async function handleLeaveWaitlist() {
    const base = getApiBase();
    if (!base) return;
    setLeaving(true);
    try {
      const url = `${base}/api/content/events/${encodeURIComponent(eventId)}/waitlist`;
      await apiClient(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus('notOnWaitlist');
      setPosition(null);
      setTotalWaitlisted(null);
    } catch {
      // keep current state, allow retry
    } finally {
      setLeaving(false);
    }
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="waitlist-badge waitlist-badge--loading" aria-live="polite">
        Checking waitlist status…
      </div>
    );
  }

  if (status === 'notOnWaitlist' || status === 'error') {
    return null;
  }

  return (
    <div className="waitlist-badge" role="status" aria-live="polite">
      <div className="waitlist-badge__info">
        <span className="waitlist-badge__icon" aria-hidden="true">
          ⏳
        </span>
        <div>
          <p className="waitlist-badge__position">
            You're <strong>#{position}</strong> on the waitlist
          </p>
          {totalWaitlisted != null && (
            <p className="waitlist-badge__total">
              {totalWaitlisted} {totalWaitlisted === 1 ? 'person' : 'people'} waiting total
            </p>
          )}
        </div>
      </div>
      <button
        className="waitlist-badge__leave-btn"
        onClick={handleLeaveWaitlist}
        disabled={leaving}
        aria-label="Leave waitlist"
      >
        {leaving ? 'Leaving…' : 'Leave Waitlist'}
      </button>
    </div>
  );
}
