import { useNavigate } from 'react-router-dom';

export default function Paywall({ feature, onBack }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '460px',
          textAlign: 'center',
          background: 'var(--bg-card, rgba(255,255,255,0.04))',
          borderRadius: '16px',
          padding: '40px 32px',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #CC1111, #880000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
          }}
        >
          🔒
        </div>
        <h2 style={{ margin: '0 0 8px' }}>Premium Feature</h2>
        <p style={{ color: 'var(--t2)', margin: '0 0 24px', lineHeight: 1.5 }}>
          {feature ? (
            <>
              Unlock <strong>{feature}</strong> and more with a Premium or Pro subscription.
            </>
          ) : (
            <>This feature requires a premium subscription. Upgrade to unlock it.</>
          )}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              border: 'none',
              background: '#CC1111',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
            }}
            onClick={() => navigate('/subscription')}
          >
            View Plans
          </button>
          {onBack && (
            <button
              style={{
                padding: '12px 28px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'none',
                color: 'var(--t1)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
              onClick={onBack}
            >
              Go Back
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--t2)', marginTop: '20px' }}>
          Plans start at $4.99/month · Cancel anytime · 7-day free trial
        </p>
      </div>
    </div>
  );
}
