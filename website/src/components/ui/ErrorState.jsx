import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorState = ({
  title = 'Failed to load content',
  description = 'We encountered an error while fetching this data. Please try again.',
  onRetry,
  error,
}) => {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 20px',
        background: 'rgba(204, 17, 17, 0.03)',
        border: '1px solid rgba(204, 17, 17, 0.12)',
        borderRadius: '12px',
        margin: '16px 0',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ color: 'var(--c1, #CC1111)', marginBottom: '12px' }}>
        <AlertCircle size={32} />
      </div>
      <h3
        style={{
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--t1, #fff)',
          margin: '0 0 8px 0',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--t2, rgba(255,255,255,0.6))',
          margin: '0 0 16px 0',
          maxWidth: '360px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {error && isDev && (
        <details
          style={{
            textAlign: 'left',
            background: 'rgba(0,0,0,0.3)',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: '#f87171',
            width: '100%',
            marginBottom: '16px',
          }}
        >
          <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>Error Details</summary>
          {error.toString()}
        </details>
      )}

      {onRetry && (
        <button
          className="btn btn-primary"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #CC1111, #880000)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
