/**
 * ForumPostSkeleton
 * Placeholder skeleton for forum post list items while data loads.
 */
export function ForumPostSkeleton({ count = 5 }) {
  return (
    <div role="status" aria-label="Loading forum posts..." aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--bdr, rgba(255,255,255,0.06))',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
          }}
        >
          {/* Avatar */}
          <div
            className="skeleton-pulse"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              flexShrink: 0,
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
            }}
          />
          <div style={{ flex: 1 }}>
            {/* Title */}
            <div
              className="skeleton-pulse"
              style={{
                height: '16px',
                width: `${55 + (i % 4) * 12}%`,
                borderRadius: '4px',
                marginBottom: '10px',
                background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
              }}
            />
            {/* Meta (author + date) */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
              <div
                className="skeleton-pulse"
                style={{
                  height: '11px',
                  width: '80px',
                  borderRadius: '4px',
                  background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
                }}
              />
              <div
                className="skeleton-pulse"
                style={{
                  height: '11px',
                  width: '60px',
                  borderRadius: '4px',
                  background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
                  animationDelay: '0.1s',
                }}
              />
            </div>
            {/* Preview text */}
            <div
              className="skeleton-pulse"
              style={{
                height: '11px',
                width: '80%',
                borderRadius: '4px',
                background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
              }}
            />
          </div>
          {/* Reply count badge */}
          <div
            className="skeleton-pulse"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              flexShrink: 0,
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default ForumPostSkeleton;
