import React, { useState, useLayoutEffect, memo } from 'react';

/**
 * PageTransition component that mimics PageIn for consistent route animations.
 */
export const PageTransition = memo(({ children, transitionKey }) => {
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    let rafOne = 0;
    let rafTwo = 0;
    setActive(false);
    rafOne = requestAnimationFrame(() => {
      rafTwo = requestAnimationFrame(() => setActive(true));
    });
    return () => {
      cancelAnimationFrame(rafOne);
      cancelAnimationFrame(rafTwo);
    };
  }, [transitionKey]);

  return (
    <div
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'none' : 'translateY(16px) scale(0.99)',
        transition:
          'opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1), transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
});

export default PageTransition;
