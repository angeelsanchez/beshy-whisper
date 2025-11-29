'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Memory {
  readonly id: string;
  readonly mensaje: string;
  readonly fecha: string;
  readonly franja: 'DIA' | 'NOCHE';
  readonly mood: string | null;
}

export interface MemoryGroup {
  readonly label: string;
  readonly monthsAgo: number;
  readonly memories: readonly Memory[];
}

interface UseOnThisDayResult {
  readonly groups: readonly MemoryGroup[];
  readonly loading: boolean;
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  if (result.getDate() !== date.getDate()) {
    result.setDate(0);
  }
  return result;
}

function formatLabel(months: number): string {
  if (months === 1) return 'Hace 1 mes';
  if (months < 12) return `Hace ${months} meses`;
  const years = Math.floor(months / 12);
  if (years === 1) return 'Hace 1 año';
  return `Hace ${years} años`;
}

const PERIODS = [1, 3, 6, 12, 24];

export function useOnThisDay(userId: string | null | undefined): UseOnThisDayResult {
  const [groups, setGroups] = useState<readonly MemoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchMemories = async (): Promise<void> => {
      setLoading(true);

      const today = new Date();
      const results: MemoryGroup[] = [];

      for (const months of PERIODS) {
        const targetDate = subtractMonths(today, months);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        const { data, error } = await supabase
          .from('entries')
          .select('id, mensaje, fecha, franja, mood')
          .eq('user_id', userId)
          .gte('fecha', startOfDay.toISOString())
          .lt('fecha', endOfDay.toISOString())
          .order('fecha', { ascending: true });

        if (cancelled) return;

        if (!error && data && data.length > 0) {
          results.push({
            label: formatLabel(months),
            monthsAgo: months,
            memories: data as Memory[],
          });
        }
      }

      if (!cancelled) {
        setGroups(results);
        setLoading(false);
      }
    };

    fetchMemories();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { groups, loading };
}
