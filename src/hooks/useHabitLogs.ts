'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

interface MilestoneEvent {
  type: string;
  message: string;
}

interface ToggleResult {
  completed: boolean;
  milestone: MilestoneEvent | null;
}

export function useHabitLogs(habitIds: string[], month?: string) {
  const { session } = useAuthSession();
  const [completedMap, setCompletedMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!session?.user?.id || habitIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (month) {
        const [year, m] = month.split('-').map(Number);
        params.set('from', `${year}-${String(m).padStart(2, '0')}-01`);
        const lastDay = new Date(year, m, 0).getDate();
        params.set('to', `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
      }

      const res = await fetch(`/api/habits/stats?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      const newMap = new Map<string, Set<string>>();

      for (const stat of data.stats) {
        const dates = new Set(Object.keys(stat.completionsByDate));
        newMap.set(stat.habitId, dates);
      }

      setCompletedMap(newMap);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, habitIds.join(','), month]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const isCompleted = useCallback((habitId: string, date: string): boolean => {
    return completedMap.get(habitId)?.has(date) ?? false;
  }, [completedMap]);

  const toggleLog = useCallback(async (habitId: string, date?: string): Promise<ToggleResult | null> => {
    if (!session?.user?.id || toggling) return null;

    setToggling(true);

    const targetDate = date ?? formatToday();
    const wasCompleted = isCompleted(habitId, targetDate);

    setCompletedMap(prev => {
      const newMap = new Map(prev);
      const dates = new Set(newMap.get(habitId) ?? []);
      if (wasCompleted) {
        dates.delete(targetDate);
      } else {
        dates.add(targetDate);
      }
      newMap.set(habitId, dates);
      return newMap;
    });

    try {
      const res = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: targetDate }),
      });

      if (!res.ok) {
        setCompletedMap(prev => {
          const newMap = new Map(prev);
          const dates = new Set(newMap.get(habitId) ?? []);
          if (wasCompleted) {
            dates.add(targetDate);
          } else {
            dates.delete(targetDate);
          }
          newMap.set(habitId, dates);
          return newMap;
        });
        return null;
      }

      const data = await res.json();
      return {
        completed: data.completed,
        milestone: data.milestone ?? null,
      };
    } catch {
      setCompletedMap(prev => {
        const newMap = new Map(prev);
        const dates = new Set(newMap.get(habitId) ?? []);
        if (wasCompleted) {
          dates.add(targetDate);
        } else {
          dates.delete(targetDate);
        }
        newMap.set(habitId, dates);
        return newMap;
      });
      return null;
    } finally {
      setToggling(false);
    }
  }, [session?.user?.id, toggling, isCompleted]);

  return {
    isCompleted,
    toggleLog,
    loading,
    toggling,
    refetch: fetchLogs,
  };
}

function formatToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
