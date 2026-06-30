import React from 'react';
import { Skeleton, SkeletonAvatar } from './Skeleton';

export const NotificationSkeleton = ({ count = 3 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`notif-skeleton-${i}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
          }}
        >
          {/* Avatar / Icon circle */}
          <SkeletonAvatar size={40} />

          {/* Content area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton width="40%" height="16px" />
            <Skeleton width="75%" height="14px" />
          </div>

          {/* Timestamp area */}
          <Skeleton width="50px" height="12px" />
        </div>
      ))}
    </div>
  );
};

export default NotificationSkeleton;
