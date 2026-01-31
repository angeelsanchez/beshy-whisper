'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

interface FollowStatusState {
  isFollowing: boolean;
  loading: boolean;
  toggling: boolean;
}

export function useFollowStatus(targetUserId: string | undefined) {
  const { session } = useAuthSession();
  const [state, setState] = useState<FollowStatusState>({
    isFollowing: false,
    loading: true,
    toggling: false,
  });

  const currentUserId = session?.user?.id;
  const isSelf = currentUserId === targetUserId;

  useEffect(() => {
    if (!currentUserId || !targetUserId || isSelf) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const controller = new AbortController();

    const fetchStatus = async () => {
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

    return () => controller.abort();
  }, [currentUserId, targetUserId, isSelf]);

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
