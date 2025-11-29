'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface FollowCounts {
  followersCount: number;
  followingCount: number;
  loading: boolean;
}

export function useFollowCounts(userId: string | undefined) {
  const [counts, setCounts] = useState<FollowCounts>({
    followersCount: 0,
    followingCount: 0,
    loading: true,
  });

  const fetchCounts = useCallback(async () => {
    if (!userId) {
      setCounts(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('followers_count, following_count')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        setCounts(prev => ({ ...prev, loading: false }));
        return;
      }

      setCounts({
        followersCount: userData.followers_count ?? 0,
        followingCount: userData.following_count ?? 0,
        loading: false,
      });
    } catch {
      setCounts(prev => ({ ...prev, loading: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { ...counts, refetch: fetchCounts };
}
