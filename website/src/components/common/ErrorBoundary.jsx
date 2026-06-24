/**
 * ErrorBoundary (common) — Reusable React error boundary.
 *
 * Upgraded from a basic reload-only implementation to a full-featured
 * boundary: supports resetError, onError callback prop, dev-only error
 * details, and proper accessible role="alert" on the fallback.
 *
 * Props:
 *   fallback  - Custom fallback element/component (receives { error, resetError })
 *   onError   - Optional callback invoked with (error, errorInfo)
 *   children  - Component tree to guard
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={({ error, resetError }) => <CustomUI />}>
 *     <HeavyWidget />
 *   </ErrorBoundary>
 */

import React from 'react';
import { DynamicIcon } from '../../shared/Icons';
import PageError from '../PageError';

function DefaultFallback({ error, resetError }) {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

  return (
    <div
      role="alert"
      style={{
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        background: 'var(--bg)',
        borderRadius: '12px',
        border: '1px solid rgba(255,68,68,0.2)',
        margin: '20px',
      }}
    >
      <div style={{ color: '#ff4444', marginBottom: '16px' }}>
        <DynamicIcon name="AlertTriangle" size={48} />
      </div>

      <h2
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--t1)',
          marginBottom: '12px',
        }}
      >
        Something went wrong
      </h2>

      <p
        style={{
          color: 'var(--t2)',
          fontSize: '0.95rem',
          maxWidth: '420px',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}
      >
        We encountered an unexpected issue while loading this content. Please try again or reload
        the page.
      </p>

      {/* Error details — dev only */}
      {error && isDev && (
        <details
          style={{
            whiteSpace: 'pre-wrap',
            background: 'var(--bdr, rgba(255,68,68,0.06))',
            padding: '10px 14px',
            borderRadius: '6px',
            maxWidth: '480px',
            marginBottom: '20px',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            color: '#ff5555',
            textAlign: 'left',
            border: '1px solid rgba(255,68,68,0.15)',
            width: '100%',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '6px' }}>
            Error Details
          </summary>
          {error.toString()}
          {error.stack && (
            <>
              <br />
              {error.stack}
            </>
          )}
        </details>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={resetError}
          aria-label="Retry loading this content"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <DynamicIcon name="RefreshCw" size={16} /> Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          aria-label="Reload the page"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.6rem 1.2rem',
            fontSize: '0.85rem',
            background: 'var(--bdr, rgba(255,255,255,0.07))',
            color: 'var(--t1)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const { fallback } = this.props;

      if (fallback) {
        if (React.isValidElement(fallback)) {
          return fallback;
        }
        if (typeof fallback === 'function') {
          return fallback({ error, resetError: this.resetError });
        }
      }

      return (
        <PageError
          error={error}
          onRetry={this.resetError}
          onGoHome={() => {
            window.location.href = '/';
          }}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
