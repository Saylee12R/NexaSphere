import { useState, useCallback, useRef, useEffect } from 'react';
import { NAV_HEIGHTS } from '../data/config';

export function useAppNavigation(setPage, setActiveTab, mobile) {
  const [wipeOn, setWipeOn] = useState(false);
  const [wipePh, setWipePh] = useState(0);

  // Store all active timer IDs so they can be cleared on unmount —
  // prevents state updates on unmounted components during page transitions.
  const timersRef = useRef([]);

  const safeTimeout = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const performTransition = useCallback(
    (action) => {
      setWipeOn(true);
      setWipePh(0);
      safeTimeout(() => setWipePh(1), 10);
      safeTimeout(() => {
        action();
        setWipePh(2);
        safeTimeout(() => {
          setWipeOn(false);
          setWipePh(0);
        }, 500);
      }, 600);
    },
    [safeTimeout]
  );

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      if (tab === 'Home') {
        performTransition(() => setPage(null));
        safeTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
      } else {
        const id = `section-${tab.toLowerCase()}`;
        const element = document.getElementById(id);
        if (element) {
          const navHeight = mobile ? NAV_HEIGHTS.MOBILE : NAV_HEIGHTS.DESKTOP;
          const targetY = element.offsetTop - navHeight;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        } else {
          performTransition(() => setPage({ type: 'section', section: tab }));
        }
      }
    },
    [setActiveTab, setPage, mobile, performTransition, safeTimeout]
  );

  return { wipeOn, wipePh, handleTabChange, performTransition };
}
