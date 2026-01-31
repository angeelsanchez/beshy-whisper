'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

export interface HabitStatData {
  habitId: string;
  habitName: string;
  totalRepetitions: number;
  currentStreak: number;
  longestStreak: number;
  completionRateWeekly: number;
  avgGapDays: number | null;
  lastCompletedAt: string | null;
  retomaCount: number;
  milestone: '21_reps' | '66_reps' | null;
  completionsByDate: Record<string, boolean>;
}

export function useHabitStats(habitId?: string) {
  const { session } = useAuthSession();
  const [stats, setStats] = useState<HabitStatData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (habitId) params.set('habitId', habitId);

      const res = await fetch(`/api/habits/stats?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      setStats(data.stats);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, habitId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getStatForHabit = useCallback((id: string): HabitStatData | undefined => {
    return stats.find(s => s.habitId === id);
  }, [stats]);

  return {
    stats,
    loading,
    getStatForHabit,
    refetch: fetchStats,
  };
}
