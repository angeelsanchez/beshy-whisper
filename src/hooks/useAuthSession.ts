'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook that extends useSession with additional functionality
 * to handle session access more reliably with debounced updates
 */
export function useAuthSession() {
  const { data: session, status, update } = useSession();
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshAttempt;
    const minRefreshInterval = 30000; // Minimum 30 seconds between refresh attempts

    // Debounced refresh logic
    if (status === 'unauthenticated' && !hasAttemptedRefresh && timeSinceLastRefresh > minRefreshInterval) {
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Debounce the refresh attempt
      refreshTimeoutRef.current = setTimeout(() => {
        update().finally(() => {
          setHasAttemptedRefresh(true);
          setLastRefreshAttempt(Date.now());
        });
      }, 1000); // Wait 1 second before attempting refresh
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [status, hasAttemptedRefresh, lastRefreshAttempt, update]);

  // Reset refresh attempt when session changes from authenticated to unauthenticated
  useEffect(() => {
    if (status === 'authenticated') {
      setHasAttemptedRefresh(false);
    }
  }, [status]);

  // Clear localStorage when session is confirmed unauthenticated
  useEffect(() => {
    if (hasAttemptedRefresh && status === 'unauthenticated') {
      // Clean up localStorage when truly logged out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isGuest');
        // Also clear any stale session storage
        sessionStorage.removeItem('isGuest');
      }
    }
  }, [hasAttemptedRefresh, status]);

  return {
    session,
    status: hasAttemptedRefresh && status === 'unauthenticated' 
      ? 'confirmed-unauthenticated' 
      : status,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
  };
} 