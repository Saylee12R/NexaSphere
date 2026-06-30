/**
 * MentorCardSkeleton
 * Placeholder skeleton for mentor profile cards while data loads.
 */
export function MentorCardSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading mentors..."
      aria-busy="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '24px',
            borderRadius: 'var(--r2, 14px)',
            border: '1px solid var(--bdr, rgba(255,255,255,0.08))',
            background: 'var(--card, rgba(255,255,255,0.02))',
          }}
        >
          {/* Avatar */}
          <div
            className="skeleton-pulse"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              marginBottom: '16px',
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
              animationDelay: `${i * 0.08}s`,
            }}
          />
          {/* Name */}
          <div
            className="skeleton-pulse"
            style={{
              height: '16px',
              width: '65%',
              borderRadius: '4px',
              marginBottom: '8px',
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
            }}
          />
          {/* Title / Role */}
          <div
            className="skeleton-pulse"
            style={{
              height: '12px',
              width: '80%',
              borderRadius: '4px',
              marginBottom: '14px',
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
            }}
          />
          {/* Tags */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[50, 70, 45].map((w, ti) => (
              <div
                key={ti}
                className="skeleton-pulse"
                style={{
                  height: '20px',
                  width: `${w}px`,
                  borderRadius: '20px',
                  background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
                  animationDelay: `${ti * 0.1}s`,
                }}
              />
            ))}
          </div>
          {/* CTA Button */}
          <div
            className="skeleton-pulse"
            style={{
              height: '36px',
              width: '100%',
              borderRadius: 'var(--r1, 8px)',
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default MentorCardSkeleton;
