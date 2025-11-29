'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

export interface HabitLevel {
  id: string;
  habit_id: string;
  level_number: number;
  label: string | null;
  target_days: number[] | null;
  weekly_target: number | null;
  target_value: number | null;
  created_at: string;
}

export interface LevelInput {
  levelNumber: number;
  label?: string;
  targetDays?: number[];
  weeklyTarget?: number;
  targetValue?: number;
}

export interface AdvanceResult {
  previousLevel: number;
  currentLevel: number;
  levelData: {
    levelNumber: number;
    label: string | null;
    targetDays: number[] | null;
    weeklyTarget: number | null;
    targetValue: number | null;
  };
}

export interface EvolutionPeriod {
  levelNumber: number;
  label: string | null;
  startDate: string;
  endDate: string | null;
  daysInLevel: number;
  completionCount: number;
  completionRate: number;
}

export interface EvolutionData {
  currentLevel: number;
  maxLevel: number;
  periods: EvolutionPeriod[];
}

export function useHabitLevels(habitId: string | null) {
  const { session } = useAuthSession();
  const [levels, setLevels] = useState<HabitLevel[]>([]);
  const [evolution, setEvolution] = useState<EvolutionData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLevels = useCallback(async () => {
    if (!session?.user?.id || !habitId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/levels`);
      if (res.ok) {
        const data = await res.json();
        setLevels(data.levels);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, habitId]);

  const fetchEvolution = useCallback(async () => {
    if (!session?.user?.id || !habitId) return;
    try {
      const res = await fetch(`/api/habits/${habitId}/evolution`);
      if (res.ok) {
        const data = await res.json();
        setEvolution(data);
      }
    } catch {
      // silently fail
    }
  }, [session?.user?.id, habitId]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const saveLevels = useCallback(async (newLevels: LevelInput[]): Promise<boolean> => {
    if (!session?.user?.id || !habitId) return false;
    try {
      const res = await fetch(`/api/habits/${habitId}/levels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels: newLevels }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setLevels(data.levels);
      window.dispatchEvent(new Event('habits-changed'));
      return true;
    } catch {
      return false;
    }
  }, [session?.user?.id, habitId]);

  const advanceLevel = useCallback(async (): Promise<AdvanceResult | null> => {
    if (!session?.user?.id || !habitId) return null;
    try {
      const res = await fetch(`/api/habits/${habitId}/advance-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) return null;
      const data: AdvanceResult = await res.json();
      window.dispatchEvent(new Event('habits-changed'));
      return data;
    } catch {
      return null;
    }
  }, [session?.user?.id, habitId]);

  return {
    levels,
    evolution,
    loading,
    fetchLevels,
    fetchEvolution,
    saveLevels,
    advanceLevel,
  };
}
