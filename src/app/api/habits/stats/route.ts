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

function calculateCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDesc = [...dates].sort((a, b) => b.localeCompare(a));
  const lastDate = new Date(sortedDesc[0]);
  lastDate.setHours(0, 0, 0, 0);

  const diffFromToday = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDesc.length; i++) {
    const current = new Date(sortedDesc[i - 1]);
    const previous = new Date(sortedDesc[i]);
    const diff = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
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
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}

function calculateCompletionRateWeekly(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const weekStart = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
  const weekEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const completedThisWeek = dates.filter(d => d >= weekStart && d <= weekEnd).length;
  return Math.round((completedThisWeek / 7) * 100);
}

function calculateAvgGapDays(dates: string[]): number | null {
  if (dates.length < 5) return null;

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let totalGap = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    totalGap += Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
  }

  return Math.round((totalGap / (sorted.length - 1)) * 10) / 10;
}

function countRetomas(dates: string[]): number {
  if (dates.length < 2) return 0;

  const sorted = [...dates].sort((a, b) => a.localeCompare(b));
  let retomas = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > RETOMA_THRESHOLD_DAYS) {
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
      .select('id, name, target_days_per_week')
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
      .select('habit_id, completed_at')
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

    const logsByHabit = new Map<string, string[]>();
    for (const log of logs ?? []) {
      const existing = logsByHabit.get(log.habit_id) ?? [];
      existing.push(log.completed_at);
      logsByHabit.set(log.habit_id, existing);
    }

    let allLogsForMilestones: { habit_id: string; completed_at: string }[] | null = null;
    if (from || to) {
      const { data: fullLogs } = await supabaseAdmin
        .from('habit_logs')
        .select('habit_id, completed_at')
        .in('habit_id', habitIds)
        .eq('user_id', session.user.id)
        .order('completed_at', { ascending: true });
      allLogsForMilestones = fullLogs;
    }

    const stats: HabitStats[] = habits.map(habit => {
      const dates = logsByHabit.get(habit.id) ?? [];

      const milestoneDates = allLogsForMilestones
        ? (allLogsForMilestones.filter(l => l.habit_id === habit.id).map(l => l.completed_at))
        : dates;

      const completionsByDate: Record<string, boolean> = {};
      for (const d of dates) {
        completionsByDate[d] = true;
      }

      return {
        habitId: habit.id,
        habitName: habit.name,
        totalRepetitions: milestoneDates.length,
        currentStreak: calculateCurrentStreak(milestoneDates),
        longestStreak: calculateLongestStreak(milestoneDates),
        completionRateWeekly: calculateCompletionRateWeekly(milestoneDates),
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
