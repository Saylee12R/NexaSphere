/**
 * ProjectCardSkeleton
 * Placeholder skeleton for project grid cards while data loads.
 */
export function ProjectCardSkeleton({ count = 6 }) {
  return (
    <div
      role="status"
      aria-label="Loading projects..."
      aria-busy="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '22px',
            borderRadius: 'var(--r2, 14px)',
            border: '1px solid var(--bdr, rgba(255,255,255,0.08))',
            background: 'var(--card, rgba(255,255,255,0.02))',
          }}
        >
          {/* Category badge */}
          <div
            className="skeleton-pulse"
            style={{
              height: '20px',
              width: '70px',
              borderRadius: '20px',
              marginBottom: '14px',
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
              animationDelay: `${i * 0.07}s`,
            }}
          />
          {/* Title */}
          <div
            className="skeleton-pulse"
            style={{
              height: '18px',
              width: `${60 + (i % 3) * 12}%`,
              borderRadius: '4px',
              marginBottom: '10px',
              background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
            }}
          />
          {/* Description */}
          {[90, 78].map((w, li) => (
            <div
              key={li}
              className="skeleton-pulse"
              style={{
                height: '12px',
                width: `${w}%`,
                borderRadius: '4px',
                marginBottom: '8px',
                background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
                animationDelay: `${li * 0.1}s`,
              }}
            />
          ))}
          {/* Tech stack tags */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '14px', marginBottom: '16px' }}>
            {[55, 45, 60].map((w, ti) => (
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
          {/* Team avatars + CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '-4px' }}>
              {[0, 1, 2].map((ai) => (
                <div
                  key={ai}
                  className="skeleton-pulse"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    marginRight: '-6px',
                    background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
                  }}
                />
              ))}
            </div>
            <div
              className="skeleton-pulse"
              style={{
                height: '32px',
                width: '80px',
                borderRadius: 'var(--r1, 8px)',
                background: 'var(--skeleton-base, rgba(255,255,255,0.06))',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProjectCardSkeleton;
