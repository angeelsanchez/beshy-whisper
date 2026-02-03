import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { habitStatsQuerySchema } from '@/lib/schemas/habits';
import { logger } from '@/lib/logger';

const RETOMA_THRESHOLD_DAYS = 7;

interface HabitStats {
  habitId: string;
  habitName: string;
  trackingType: 'binary' | 'quantity';
  targetValue: number | null;
  unit: string | null;
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

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const todayStr = toLocalDateStr(new Date());
  const sortedDesc = [...dates].sort((a, b) => b.localeCompare(a));

  const diffFromToday = daysDiff(todayStr, sortedDesc[0]);
  if (diffFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDesc.length; i++) {
    const diff = daysDiff(sortedDesc[i - 1], sortedDesc[i]);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const diff = daysDiff(sorted[i], sorted[i - 1]);
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function calculateCompletionRateWeekly(dates: string[], targetDaysCount: number): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const weekStart = toLocalDateStr(sevenDaysAgo);
  const weekEnd = toLocalDateStr(today);

  const completedThisWeek = dates.filter(d => d >= weekStart && d <= weekEnd).length;
  const divisor = Math.max(targetDaysCount, 1);
  return Math.min(Math.round((completedThisWeek / divisor) * 100), 100);
}

function calculateAvgGapDays(dates: string[]): number | null {
  if (dates.length < 5) return null;

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let totalGap = 0;

  for (let i = 1; i < sorted.length; i++) {
    totalGap += daysDiff(sorted[i], sorted[i - 1]);
  }

  return Math.round((totalGap / (sorted.length - 1)) * 10) / 10;
}

function countRetomas(dates: string[]): number {
  if (dates.length < 2) return 0;

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let retomas = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gap = daysDiff(sorted[i], sorted[i - 1]);
    if (gap > RETOMA_THRESHOLD_DAYS) {
      retomas++;
    }
  }
  return retomas;
}

function getMilestone(totalReps: number): '21_reps' | '66_reps' | null {
  if (totalReps >= 66) return '66_reps';
  if (totalReps >= 21) return '21_reps';
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const parsed = habitStatsQuerySchema.safeParse({
      habitId: searchParams.get('habitId') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { habitId, from, to } = parsed.data;

    let habitsQuery = supabaseAdmin
      .from('habits')
      .select('id, name, target_days_per_week, target_days, tracking_type, target_value, unit')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (habitId) {
      habitsQuery = habitsQuery.eq('id', habitId);
    }

    const { data: habits, error: habitsError } = await habitsQuery;

    if (habitsError) {
      logger.error('Error fetching habits for stats', { detail: habitsError.message });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    if (!habits?.length) {
      return NextResponse.json({ stats: [] });
    }

    const habitIds = habits.map(h => h.id);

    let logsQuery = supabaseAdmin
      .from('habit_logs')
      .select('habit_id, completed_at, value')
      .in('habit_id', habitIds)
      .eq('user_id', session.user.id)
      .order('completed_at', { ascending: true });

    if (from) logsQuery = logsQuery.gte('completed_at', from);
    if (to) logsQuery = logsQuery.lte('completed_at', to);

    const { data: logs, error: logsError } = await logsQuery;

    if (logsError) {
      logger.error('Error fetching habit logs for stats', { detail: logsError.message });
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    interface LogEntry { habit_id: string; completed_at: string; value: number | null }

    const logsByHabit = new Map<string, LogEntry[]>();
    for (const log of (logs ?? []) as LogEntry[]) {
      const existing = logsByHabit.get(log.habit_id) ?? [];
      existing.push(log);
      logsByHabit.set(log.habit_id, existing);
    }

    let allLogsForMilestones: LogEntry[] | null = null;
    if (from || to) {
      const { data: fullLogs } = await supabaseAdmin
        .from('habit_logs')
        .select('habit_id, completed_at, value')
        .in('habit_id', habitIds)
        .eq('user_id', session.user.id)
        .order('completed_at', { ascending: true });
      allLogsForMilestones = fullLogs as LogEntry[] | null;
    }

    const stats: HabitStats[] = habits.map(habit => {
      const habitLogs = logsByHabit.get(habit.id) ?? [];

      const milestoneEntries = allLogsForMilestones
        ? allLogsForMilestones.filter(l => l.habit_id === habit.id)
        : habitLogs;
      const milestoneDates = milestoneEntries.map(l => l.completed_at);

      const isQuantity = habit.tracking_type === 'quantity';
      const completionsByDate: Record<string, boolean | number> = {};
      for (const log of habitLogs) {
        completionsByDate[log.completed_at] = isQuantity ? (log.value ?? 0) : true;
      }

      let totalValue: number | null = null;
      let avgDailyValue: number | null = null;
      if (isQuantity && milestoneEntries.length > 0) {
        totalValue = milestoneEntries.reduce((sum, l) => sum + (l.value ?? 0), 0);
        avgDailyValue = Math.round((totalValue / milestoneEntries.length) * 10) / 10;
      }

      return {
        habitId: habit.id,
        habitName: habit.name,
        trackingType: (habit.tracking_type ?? 'binary') as 'binary' | 'quantity',
        targetValue: habit.target_value ?? null,
        unit: habit.unit ?? null,
        totalRepetitions: milestoneDates.length,
        totalValue,
        avgDailyValue,
        currentStreak: calculateCurrentStreak(milestoneDates),
        longestStreak: calculateLongestStreak(milestoneDates),
        completionRateWeekly: calculateCompletionRateWeekly(
          milestoneDates,
          Array.isArray(habit.target_days) ? habit.target_days.length : (habit.target_days_per_week ?? 7)
        ),
        avgGapDays: calculateAvgGapDays(milestoneDates),
        lastCompletedAt: milestoneDates.length > 0 ? milestoneDates[milestoneDates.length - 1] : null,
        retomaCount: countRetomas(milestoneDates),
        milestone: getMilestone(milestoneDates.length),
        completionsByDate,
      };
    });

    return NextResponse.json({ stats });
  } catch (error) {
    logger.error('Error in habits stats GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
