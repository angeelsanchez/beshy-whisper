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
  value?: number;
}

function formatToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function useHabitLogs(habitIds: string[], month?: string) {
  const { session } = useAuthSession();
  const [completedMap, setCompletedMap] = useState<Map<string, Set<string>>>(new Map());
  const [valueMap, setValueMap] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const habitIdsKey = habitIds.join(',');
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
      const newCompletedMap = new Map<string, Set<string>>();
      const newValueMap = new Map<string, Map<string, number>>();

      for (const stat of data.stats) {
        const dates = new Set<string>();
        const values = new Map<string, number>();

        for (const [dateKey, val] of Object.entries(stat.completionsByDate)) {
          dates.add(dateKey);
          if (typeof val === 'number') {
            values.set(dateKey, val);
          }
        }

        newCompletedMap.set(stat.habitId, dates);
        if (values.size > 0) {
          newValueMap.set(stat.habitId, values);
        }
      }

      setCompletedMap(newCompletedMap);
      setValueMap(newValueMap);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, habitIdsKey, month]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    function handleRefresh(): void {
      fetchLogs();
    }

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('habits-changed', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('habits-changed', handleRefresh);
    };
  }, [fetchLogs]);

  const isCompleted = useCallback((habitId: string, date: string): boolean => {
    return completedMap.get(habitId)?.has(date) ?? false;
  }, [completedMap]);

  const getValue = useCallback((habitId: string, date: string): number => {
    return valueMap.get(habitId)?.get(date) ?? 0;
  }, [valueMap]);

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
        revertCompletedMap(habitId, targetDate, wasCompleted);
        return null;
      }

      const data = await res.json();
      return {
        completed: data.completed,
        milestone: data.milestone ?? null,
        value: data.value,
      };
    } catch {
      revertCompletedMap(habitId, targetDate, wasCompleted);
      return null;
    } finally {
      setToggling(false);
    }
  }, [session?.user?.id, toggling, isCompleted]);

  const incrementLog = useCallback(async (
    habitId: string,
    amount: number,
    date?: string
  ): Promise<ToggleResult | null> => {
    if (!session?.user?.id || toggling) return null;

    setToggling(true);
    const targetDate = date ?? formatToday();
    const currentValue = getValue(habitId, targetDate);
    const optimisticValue = Math.max(0, currentValue + amount);

    setValueMap(prev => {
      const newMap = new Map(prev);
      const values = new Map(newMap.get(habitId) ?? []);
      values.set(targetDate, optimisticValue);
      newMap.set(habitId, values);
      return newMap;
    });

    if (optimisticValue > 0) {
      setCompletedMap(prev => {
        const newMap = new Map(prev);
        const dates = new Set(newMap.get(habitId) ?? []);
        dates.add(targetDate);
        newMap.set(habitId, dates);
        return newMap;
      });
    }

    try {
      const res = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId, date: targetDate, value: amount }),
      });

      if (!res.ok) {
        revertValueMap(habitId, targetDate, currentValue);
        return null;
      }

      const data = await res.json();

      setValueMap(prev => {
        const newMap = new Map(prev);
        const values = new Map(newMap.get(habitId) ?? []);
        if (data.value !== undefined) {
          values.set(targetDate, data.value);
        }
        newMap.set(habitId, values);
        return newMap;
      });

      if (data.action === 'removed') {
        setCompletedMap(prev => {
          const newMap = new Map(prev);
          const dates = new Set(newMap.get(habitId) ?? []);
          dates.delete(targetDate);
          newMap.set(habitId, dates);
          return newMap;
        });
      }

      return {
        completed: data.completed,
        milestone: data.milestone ?? null,
        value: data.value,
      };
    } catch {
      revertValueMap(habitId, targetDate, currentValue);
      return null;
    } finally {
      setToggling(false);
    }
  }, [session?.user?.id, toggling, getValue]);

  function revertCompletedMap(habitId: string, date: string, wasCompleted: boolean): void {
    setCompletedMap(prev => {
      const newMap = new Map(prev);
      const dates = new Set(newMap.get(habitId) ?? []);
      if (wasCompleted) {
        dates.add(date);
      } else {
        dates.delete(date);
      }
      newMap.set(habitId, dates);
      return newMap;
    });
  }

  function revertValueMap(habitId: string, date: string, previousValue: number): void {
    setValueMap(prev => {
      const newMap = new Map(prev);
      const values = new Map(newMap.get(habitId) ?? []);
      values.set(date, previousValue);
      newMap.set(habitId, values);
      return newMap;
    });
  }

  return {
    isCompleted,
    getValue,
    toggleLog,
    incrementLog,
    loading,
    toggling,
    refetch: fetchLogs,
  };
}
