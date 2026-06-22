import React from 'react';
import * as Sentry from '@sentry/react';
import './GlobalErrorBoundary.css';

const FallbackUI = ({ error }) => {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

  return (
    <div className="global-error-boundary" role="alert">
      <div className="global-error-content">
        <h1>Something went wrong. Please reload the page.</h1>

        {/* Error details are shown in development only to avoid leaking
            stack traces and internal paths to end users in production. */}
        {error && isDev && (
          <pre
            style={{
              background: 'rgba(255,0,0,0.07)',
              border: '1px solid rgba(255,0,0,0.15)',
              color: '#ff5555',
              padding: '14px',
              borderRadius: '8px',
              textAlign: 'left',
              maxHeight: '220px',
              overflow: 'auto',
              fontSize: '0.82rem',
              fontFamily: 'monospace',
              marginTop: '15px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {error.toString()}
            <br />
            {error.stack}
          </pre>
        )}

        <button
          onClick={() => window.location.reload()}
          aria-label="Reload the page"
          className="retry-button"
          style={{ marginTop: '16px' }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
};

const GlobalErrorBoundary = ({ children }) => {
  return <Sentry.ErrorBoundary fallback={FallbackUI}>{children}</Sentry.ErrorBoundary>;
};

export default GlobalErrorBoundary;
