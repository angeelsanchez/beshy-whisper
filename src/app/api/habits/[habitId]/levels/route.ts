import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { setLevelsSchema } from '@/lib/schemas/habit-levels';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ habitId: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verifyOwnership(habitId: string, userId: string): Promise<
  { error: string; status: 400 | 403 | 404 | 500 } | { habit: { id: string; user_id: string } }
> {
  if (!UUID_REGEX.test(habitId)) {
    return { error: 'Invalid habit ID', status: 400 };
  }

  const { data: habit, error } = await supabaseAdmin
    .from('habits')
    .select('id, user_id')
    .eq('id', habitId)
    .maybeSingle();

  if (error) {
    logger.error('Error verifying habit ownership for levels', { detail: error.message });
    return { error: 'Internal server error', status: 500 };
  }
  if (!habit) return { error: 'Habit not found', status: 404 };
  if (habit.user_id !== userId) return { error: 'Forbidden', status: 403 };
  return { habit };
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
    const ownership = await verifyOwnership(habitId, session.user.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const { data: levels, error } = await supabaseAdmin
      .from('habit_levels')
      .select('*')
      .eq('habit_id', habitId)
      .order('level_number', { ascending: true });

    if (error) {
      logger.error('Error fetching habit levels', { detail: error.message });
      return NextResponse.json({ error: 'Failed to fetch levels' }, { status: 500 });
    }

    return NextResponse.json({ levels: levels ?? [] });
  } catch (error) {
    logger.error('Error in habit levels GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await params;
    const ownership = await verifyOwnership(habitId, session.user.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const body = await request.json();
    const parsed = setLevelsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { levels } = parsed.data;
    const sortedLevels = [...levels].sort((a, b) => a.levelNumber - b.levelNumber);

    const { error: deleteError } = await supabaseAdmin
      .from('habit_levels')
      .delete()
      .eq('habit_id', habitId);

    if (deleteError) {
      logger.error('Error clearing habit levels', { detail: deleteError.message });
      return NextResponse.json({ error: 'Failed to save levels' }, { status: 500 });
    }

    const rows = sortedLevels.map((l) => ({
      habit_id: habitId,
      level_number: l.levelNumber,
      label: l.label ?? null,
      target_days: l.targetDays ?? null,
      weekly_target: l.weeklyTarget ?? null,
      target_value: l.targetValue ?? null,
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('habit_levels')
      .insert(rows)
      .select();

    if (insertError) {
      logger.error('Error inserting habit levels', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to save levels' }, { status: 500 });
    }

    const firstLevel = sortedLevels[0];
    const levelUpdates: Record<string, unknown> = {
      has_progression: true,
      current_level: 1,
      level_started_at: new Date().toISOString(),
    };

    if (firstLevel.targetDays) {
      levelUpdates.target_days = firstLevel.targetDays.sort((a, b) => a - b);
    }
    if (firstLevel.weeklyTarget !== undefined) {
      levelUpdates.weekly_target = firstLevel.weeklyTarget;
    }
    if (firstLevel.targetValue !== undefined) {
      levelUpdates.target_value = firstLevel.targetValue;
    }

    const { error: habitUpdateError } = await supabaseAdmin
      .from('habits')
      .update(levelUpdates)
      .eq('id', habitId);

    if (habitUpdateError) {
      logger.error('Error updating habit for progression', { detail: habitUpdateError.message });
      return NextResponse.json({ error: 'Failed to activate progression' }, { status: 500 });
    }

    logger.info('Habit levels configured', { userId: session.user.id, habitId, levelCount: rows.length });
    return NextResponse.json({ levels: inserted ?? [] });
  } catch (error) {
    logger.error('Error in habit levels PUT', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
