'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

export interface HabitStatData {
  habitId: string;
  habitName: string;
  trackingType: 'binary' | 'quantity' | 'timer';
  targetValue: number | null;
  unit: string | null;
  frequencyMode: 'specific_days' | 'weekly_count';
  weeklyTarget: number | null;
  hasProgression: boolean;
  currentLevel: number | null;
  maxLevel: number | null;
  shouldSuggestAdvance: boolean;
  totalRepetitions: number;
  totalValue: number | null;
  avgDailyValue: number | null;
  currentStreak: number;
  longestStreak: number;
  completionRateWeekly: number;
  avgGapDays: number | null;
  lastCompletedAt: string | null;
  retomaCount: number;
  milestone: '21_reps' | '66_reps' | null;
  completionsByDate: Record<string, boolean | number>;
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

  useEffect(() => {
    function handleRefresh(): void {
      fetchStats();
    }

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('habits-changed', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('habits-changed', handleRefresh);
    };
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
