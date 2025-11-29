'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

interface FollowStatusState {
  isFollowing: boolean;
  loading: boolean;
  toggling: boolean;
}

export function useFollowStatus(targetUserId: string | undefined) {
  const { session, isLoading: sessionLoading } = useAuthSession();
  const [state, setState] = useState<FollowStatusState>({
    isFollowing: false,
    loading: true,
    toggling: false,
  });
  const hasFetchedRef = useRef(false);

  const currentUserId = session?.user?.id;
  const isSelf = currentUserId === targetUserId;

  useEffect(() => {
    // Wait for session to finish loading before making any decisions
    if (sessionLoading) {
      return;
    }

    // If no user is logged in, or no target, or viewing self - stop loading
    if (!currentUserId || !targetUserId || isSelf) {
      setState(prev => ({ ...prev, loading: false }));
      hasFetchedRef.current = false;
      return;
    }

    // Prevent duplicate fetches for the same targetUserId
    if (hasFetchedRef.current) {
      return;
    }

    const controller = new AbortController();
    hasFetchedRef.current = true;

    const fetchStatus = async () => {
      setState(prev => ({ ...prev, loading: true }));

      try {
        const res = await fetch(`/api/follows/status?targetUserId=${targetUserId}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        const data = await res.json();
        setState(prev => ({ ...prev, isFollowing: data.isFollowing, loading: false }));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchStatus();

    return () => {
      controller.abort();
    };
  }, [currentUserId, targetUserId, isSelf, sessionLoading]);

  // Reset fetch flag when targetUserId changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUserId || !targetUserId || isSelf || state.toggling) return;

    setState(prev => ({ ...prev, toggling: true, isFollowing: !prev.isFollowing }));

    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      if (!res.ok) {
        setState(prev => ({ ...prev, isFollowing: !prev.isFollowing, toggling: false }));
        return;
      }

      const data = await res.json();
      setState(prev => ({ ...prev, isFollowing: data.isFollowing, toggling: false }));
    } catch {
      setState(prev => ({ ...prev, isFollowing: !prev.isFollowing, toggling: false }));
    }
  }, [currentUserId, targetUserId, isSelf, state.toggling]);

  return {
    isFollowing: state.isFollowing,
    loading: state.loading,
    toggling: state.toggling,
    toggleFollow,
    isSelf,
  };
}
