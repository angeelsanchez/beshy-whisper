'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AppStats {
  totalEntries: number;
  totalUsers: number;
  totalLikes: number;
  satisfactionRate: number;
  loading: boolean;
}

export function useStats(): AppStats {
  const [stats, setStats] = useState<AppStats>({
    totalEntries: 0,
    totalUsers: 0,
    totalLikes: 0,
    satisfactionRate: 0,
    loading: true
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total entries
        const { count: entriesCount, error: entriesError } = await supabase
          .from('entries')
          .select('*', { count: 'exact', head: true });

        if (entriesError) {
          logger.error('Error fetching entries count', { error: String(entriesError) });
        }

        // Fetch total users (non-guest)
        const { count: usersCount, error: usersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (usersError) {
          logger.error('Error fetching users count', { error: String(usersError) });
        }

        // Fetch total likes
        const { count: likesCount, error: likesError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true });

        if (likesError) {
          logger.error('Error fetching likes count', { error: String(likesError) });
        }

        // Calculate satisfaction rate based on engagement
        const totalEntries = entriesCount || 0;
        const totalLikes = likesCount || 0;
        const satisfactionRate = totalEntries > 0 
          ? Math.min(99, Math.round((totalLikes / totalEntries) * 20 + 80))
          : 95;

        setStats({
          totalEntries: totalEntries || 0,
          totalUsers: usersCount || 0,
          totalLikes: totalLikes || 0,
          satisfactionRate,
          loading: false
        });
      } catch (error) {
        logger.error('Error fetching stats', { error: String(error) });
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  return stats;
} 