import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { advanceLevelSchema } from '@/lib/schemas/habit-levels';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ habitId: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
    if (!UUID_REGEX.test(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = advanceLevelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('id, user_id, has_progression, current_level')
      .eq('id', habitId)
      .maybeSingle();

    if (habitError) {
      logger.error('Error fetching habit for advance', { detail: habitError.message });
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

    const currentLevel = habit.current_level ?? 1;
    const nextLevel = currentLevel + 1;

    const { data: nextLevelData, error: levelError } = await supabaseAdmin
      .from('habit_levels')
      .select('*')
      .eq('habit_id', habitId)
      .eq('level_number', nextLevel)
      .maybeSingle();

    if (levelError) {
      logger.error('Error fetching next level', { detail: levelError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!nextLevelData) {
      return NextResponse.json({ error: 'Already at maximum level' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      current_level: nextLevel,
      level_started_at: new Date().toISOString(),
    };

    if (nextLevelData.target_days) {
      updates.target_days = nextLevelData.target_days;
    }
    if (nextLevelData.weekly_target !== null) {
      updates.weekly_target = nextLevelData.weekly_target;
    }
    if (nextLevelData.target_value !== null) {
      updates.target_value = nextLevelData.target_value;
    }

    const { error: updateError } = await supabaseAdmin
      .from('habits')
      .update(updates)
      .eq('id', habitId);

    if (updateError) {
      logger.error('Error advancing habit level', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to advance level' }, { status: 500 });
    }

    logger.info('Habit level advanced', {
      userId: session.user.id,
      habitId,
      from: currentLevel,
      to: nextLevel,
    });

    return NextResponse.json({
      previousLevel: currentLevel,
      currentLevel: nextLevel,
      levelData: {
        levelNumber: nextLevelData.level_number,
        label: nextLevelData.label,
        targetDays: nextLevelData.target_days,
        weeklyTarget: nextLevelData.weekly_target,
        targetValue: nextLevelData.target_value,
      },
    });
  } catch (error) {
    logger.error('Error in advance-level POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
