import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ habitId: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z');
  const db = new Date(b + 'T00:00:00Z');
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

interface LevelPeriod {
  levelNumber: number;
  label: string | null;
  startDate: string;
  endDate: string | null;
  daysInLevel: number;
  completionCount: number;
  completionRate: number;
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
    if (!UUID_REGEX.test(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
    }

    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('id, user_id, has_progression, current_level, level_started_at, created_at')
      .eq('id', habitId)
      .maybeSingle();

    if (habitError) {
      logger.error('Error fetching habit for evolution', { detail: habitError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }
    if (habit.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!habit.has_progression) {
      return NextResponse.json({ error: 'Habit does not have progression enabled' }, { status: 400 });
    }

    const { data: levels, error: levelsError } = await supabaseAdmin
      .from('habit_levels')
      .select('*')
      .eq('habit_id', habitId)
      .order('level_number', { ascending: true });

    if (levelsError) {
      logger.error('Error fetching levels for evolution', { detail: levelsError.message });
      return NextResponse.json({ error: 'Failed to fetch evolution data' }, { status: 500 });
    }

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('habit_logs')
      .select('completed_at')
      .eq('habit_id', habitId)
      .eq('user_id', session.user.id)
      .order('completed_at', { ascending: true });

    if (logsError) {
      logger.error('Error fetching logs for evolution', { detail: logsError.message });
      return NextResponse.json({ error: 'Failed to fetch evolution data' }, { status: 500 });
    }

    const logDates = (logs ?? []).map((l: { completed_at: string }) => l.completed_at);
    const todayStr = toDateStr(new Date());
    const currentLevel = habit.current_level ?? 1;
    const maxLevel = (levels ?? []).length;

    const periods: LevelPeriod[] = [];

    if (levels && levels.length > 0) {
      const habitCreatedDate = habit.created_at
        ? toDateStr(new Date(habit.created_at))
        : todayStr;

      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const isCurrentLevel = level.level_number === currentLevel;
        const isPastLevel = level.level_number < currentLevel;

        if (!isPastLevel && !isCurrentLevel) continue;

        let startDate: string;
        if (i === 0) {
          startDate = habitCreatedDate;
        } else if (isCurrentLevel && habit.level_started_at) {
          startDate = toDateStr(new Date(habit.level_started_at));
        } else {
          startDate = habitCreatedDate;
        }

        const endDate = isCurrentLevel ? null : (
          habit.level_started_at ? toDateStr(new Date(habit.level_started_at)) : todayStr
        );

        const effectiveEnd = endDate ?? todayStr;
        const daysInLevel = Math.max(1, daysDiff(effectiveEnd, startDate) + 1);

        const completionsInPeriod = logDates.filter(
          (d: string) => d >= startDate && d <= effectiveEnd
        ).length;

        const completionRate = Math.min(
          Math.round((completionsInPeriod / daysInLevel) * 100),
          100
        );

        periods.push({
          levelNumber: level.level_number,
          label: level.label,
          startDate,
          endDate,
          daysInLevel,
          completionCount: completionsInPeriod,
          completionRate,
        });
      }
    }

    return NextResponse.json({
      currentLevel,
      maxLevel,
      periods,
    });
  } catch (error) {
    logger.error('Error in evolution GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
