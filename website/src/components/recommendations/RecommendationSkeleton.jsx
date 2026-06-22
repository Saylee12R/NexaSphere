import React from 'react';
import '../../styles/resume.css';

export default function RecommendationSkeleton() {
  return (
    <div className="recommendations-skeleton">
      <div className="skeleton-title-bar"></div>
      <div className="skeleton-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-header"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-chips">
              <div className="skeleton-chip"></div>
              <div className="skeleton-chip"></div>
              <div className="skeleton-chip"></div>
            </div>
            <div className="skeleton-box"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
