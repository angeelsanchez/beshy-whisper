'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: 'daily' | 'weekly';
  target_days_per_week: number;
  target_days: number[];
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CreateHabitData {
  name: string;
  description?: string;
  targetDays?: number[];
  color?: string;
}

interface UpdateHabitData {
  name?: string;
  description?: string | null;
  targetDays?: number[];
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export function useHabits() {
  const { session } = useAuthSession();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/habits');
      if (!res.ok) {
        setError('Error al cargar habitos');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setHabits(data.habits);
      setError(null);
    } catch {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const createHabit = useCallback(async (data: CreateHabitData): Promise<Habit | null> => {
    if (!session?.user?.id) return null;

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Error al crear habito');
        return null;
      }

      const result = await res.json();
      setHabits(prev => [...prev, result.habit]);
      setError(null);
      return result.habit;
    } catch {
      setError('Error de conexion');
      return null;
    }
  }, [session?.user?.id]);

  const updateHabit = useCallback(async (habitId: string, data: UpdateHabitData): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const res = await fetch(`/api/habits/${habitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Error al actualizar habito');
        return false;
      }

      const result = await res.json();
      setHabits(prev => prev.map(h => h.id === habitId ? result.habit : h));
      setError(null);
      return true;
    } catch {
      setError('Error de conexion');
      return false;
    }
  }, [session?.user?.id]);

  const deleteHabit = useCallback(async (habitId: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    const previousHabits = habits;
    setHabits(prev => prev.filter(h => h.id !== habitId));

    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });

      if (!res.ok) {
        setHabits(previousHabits);
        setError('Error al eliminar habito');
        return false;
      }

      setError(null);
      return true;
    } catch {
      setHabits(previousHabits);
      setError('Error de conexion');
      return false;
    }
  }, [session?.user?.id, habits]);

  return {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    refetch: fetchHabits,
  };
}
