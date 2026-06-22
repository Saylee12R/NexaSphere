import { useState } from 'react';

const DIMENSIONS = [
  { key: 'overall', label: 'Overall Experience' },
  { key: 'content', label: 'Content Quality' },
  { key: 'speaker', label: 'Speaker / Facilitator' },
  { key: 'venue', label: 'Venue / Platform' },
  { key: 'logistics', label: 'Organisation & Logistics' },
  { key: 'networking', label: 'Networking Opportunities' },
  { key: 'value', label: 'Value for Time Invested' },
];

function StarRating({ value, onChange, name }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-rating" role="group" aria-label={name}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star ${star <= (hovered || value) ? 'filled' : ''}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function NPSSelector({ value, onChange }) {
  return (
    <div className="nps-selector">
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`nps-btn ${value === i ? 'selected' : ''} ${
            i <= 6 ? 'detractor' : i <= 8 ? 'passive' : 'promoter'
          }`}
          onClick={() => onChange(i)}
          aria-label={`Score ${i}`}
        >
          {i}
        </button>
      ))}
      <div className="nps-labels">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

export default function FeedbackForm({ eventId, eventTitle, onSubmit, quickMode = false }) {
  const [ratings, setRatings] = useState({});
  const [nps, setNps] = useState(null);
  const [openEnded, setOpenEnded] = useState({ enjoyed: '', improve: '', comments: '' });
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleRating = (dim, val) => setRatings((r) => ({ ...r, [dim]: val }));

  const handleSubmit = async () => {
    if (!ratings.overall) {
      setError('Please rate your overall experience.');
      return;
    }
    if (nps === null && !quickMode) {
      setError('Please provide your NPS score.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ratings, nps, openEnded, anonymous }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
      onSubmit?.();
    } catch (e) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="feedback-success">
        <div className="success-icon">🎉</div>
        <h3>Thanks for your feedback!</h3>
        <p>
          You've earned <strong>+25 XP</strong> for helping improve NexaSphere events.
        </p>
      </div>
    );
  }

  return (
    <div className="feedback-form">
      <h2>
        How was <em>{eventTitle}</em>?
      </h2>

      {quickMode ? (
        <div className="quick-mode">
          <p>Quick rating</p>
          <StarRating
            value={ratings.overall || 0}
            onChange={(v) => handleRating('overall', v)}
            name="Overall"
          />
        </div>
      ) : (
        <>
          <section>
            <h3>Rate each dimension</h3>
            {DIMENSIONS.map(({ key, label }) => (
              <div key={key} className="dimension-row">
                <span className="dimension-label">{label}</span>
                <StarRating
                  value={ratings[key] || 0}
                  onChange={(v) => handleRating(key, v)}
                  name={label}
                />
              </div>
            ))}
          </section>

          <section>
            <h3>Would you recommend this event?</h3>
            <p className="nps-question">
              How likely are you to recommend this event to a friend? (0 = not at all, 10 =
              extremely likely)
            </p>
            <NPSSelector value={nps} onChange={setNps} />
          </section>

          <section>
            <h3>Tell us more</h3>
            <label>
              What did you enjoy most?
              <textarea
                value={openEnded.enjoyed}
                onChange={(e) => setOpenEnded((o) => ({ ...o, enjoyed: e.target.value }))}
                rows={3}
                maxLength={1000}
              />
            </label>
            <label>
              What could be improved?
              <textarea
                value={openEnded.improve}
                onChange={(e) => setOpenEnded((o) => ({ ...o, improve: e.target.value }))}
                rows={3}
                maxLength={1000}
              />
            </label>
            <label>
              Any additional comments?
              <textarea
                value={openEnded.comments}
                onChange={(e) => setOpenEnded((o) => ({ ...o, comments: e.target.value }))}
                rows={2}
                maxLength={500}
              />
            </label>
          </section>

          <label className="anonymous-toggle">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Submit anonymously
          </label>
        </>
      )}

      {error && <p className="form-error">{error}</p>}

      <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Feedback (+25 XP)'}
      </button>
    </div>
  );
}
