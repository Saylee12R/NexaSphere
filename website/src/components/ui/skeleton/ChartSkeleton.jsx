import React from 'react';
import { Skeleton } from './Skeleton';

export const ChartSkeleton = () => {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        minHeight: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="180px" height="24px" />
        <Skeleton width="80px" height="18px" />
      </div>

      {/* Visual representation of chart bars */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height: '200px',
          padding: '10px 0',
          gap: '12px',
        }}
      >
        <Skeleton height="40%" width="32px" />
        <Skeleton height="70%" width="32px" />
        <Skeleton height="55%" width="32px" />
        <Skeleton height="90%" width="32px" />
        <Skeleton height="35%" width="32px" />
        <Skeleton height="80%" width="32px" />
        <Skeleton height="60%" width="32px" />
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Skeleton rounded width="12px" height="12px" />
          <Skeleton width="60px" height="14px" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Skeleton rounded width="12px" height="12px" />
          <Skeleton width="60px" height="14px" />
        </div>
      </div>
    </div>
  );
};

export default ChartSkeleton;
