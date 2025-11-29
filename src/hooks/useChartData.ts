'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { MOOD_VALUES, type Mood } from '@/types/mood';

export interface WeeklyPostData {
  readonly week: string;
  readonly count: number;
}

export interface MoodCount {
  readonly mood: Mood;
  readonly count: number;
}

export interface DailyMood {
  readonly date: string;
  readonly mood: Mood;
  readonly count: number;
}

export interface WeeklyObjectivesRate {
  readonly week: string;
  readonly rate: number;
}

function getWeekLabel(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'short' });
  return `${day} ${month}`;
}

function getWeekStart(date: Date, weeksAgo: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay() - weeksAgo * 7);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function usePostingFrequency(userId: string | null | undefined): {
  data: readonly WeeklyPostData[];
  loading: boolean;
} {
  const [raw, setRaw] = useState<{ fecha: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    const fetch = async () => {
      const twelveWeeksAgo = getWeekStart(new Date(), 12);
      const { data, error } = await supabase
        .from('entries')
        .select('fecha')
        .eq('user_id', userId)
        .gte('fecha', twelveWeeksAgo.toISOString())
        .order('fecha', { ascending: true });

      if (!cancelled && !error) {
        setRaw(data ?? []);
      }
      if (!cancelled) setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [userId]);

  const data = useMemo(() => {
    const now = new Date();
    const weeks: WeeklyPostData[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = getWeekStart(now, i);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = raw.filter((e) => {
        const d = new Date(e.fecha);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeks.push({ week: getWeekLabel(weekStart), count });
    }

    return weeks;
  }, [raw]);

  return { data, loading };
}

export function useMoodDistribution(userId: string | null | undefined): {
  data: readonly MoodCount[];
  loading: boolean;
} {
  const [raw, setRaw] = useState<{ mood: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    const fetch = async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('mood')
        .eq('user_id', userId)
        .not('mood', 'is', null);

      if (!cancelled && !error) {
        setRaw(data ?? []);
      }
      if (!cancelled) setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [userId]);

  const data = useMemo(() => {
    const counts = new Map<Mood, number>();
    for (const entry of raw) {
      if (entry.mood && MOOD_VALUES.includes(entry.mood as Mood)) {
        const mood = entry.mood as Mood;
        counts.set(mood, (counts.get(mood) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);
  }, [raw]);

  return { data, loading };
}

export function useObjectivesRate(userId: string | null | undefined): {
  data: readonly WeeklyObjectivesRate[];
  loading: boolean;
} {
  const [raw, setRaw] = useState<{ done: boolean; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    const fetch = async () => {
      const twelveWeeksAgo = getWeekStart(new Date(), 12);
      const { data, error } = await supabase
        .from('objectives')
        .select('done, created_at')
        .eq('user_id', userId)
        .gte('created_at', twelveWeeksAgo.toISOString());

      if (!cancelled && !error) {
        setRaw(data ?? []);
      }
      if (!cancelled) setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [userId]);

  const data = useMemo(() => {
    const now = new Date();
    const weeks: WeeklyObjectivesRate[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = getWeekStart(now, i);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekObjectives = raw.filter((o) => {
        const d = new Date(o.created_at);
        return d >= weekStart && d < weekEnd;
      });

      const total = weekObjectives.length;
      const done = weekObjectives.filter((o) => o.done).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;

      weeks.push({ week: getWeekLabel(weekStart), rate });
    }

    return weeks;
  }, [raw]);

  return { data, loading };
}
