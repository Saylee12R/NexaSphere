import { useNavigate } from 'react-router-dom';
import { useEffect, useCallback, useState } from 'react';
import { auth } from '../services/auth';
import { useEventListener } from './useEventListener';
import { EVENTS } from '../services/eventEmitter';

export function useAuth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auth.verifySession().then((valid) => {
      if (cancelled) return;
      if (!valid) auth.logout();
      setIsVerified(valid);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleExpiry = useCallback(() => {
    auth.logout().then(() => navigate('/login'));
  }, [navigate]);

  useEventListener(EVENTS.AUTH_TOKEN_EXPIRED, handleExpiry);

  const logout = useCallback(() => {
    auth.logout().then(() => navigate('/login'));
  }, [navigate]);

  return {
    isLoading,
    isVerified,
    email: auth.getEmail(),
    logout,
  };
}
