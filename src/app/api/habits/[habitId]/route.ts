import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { updateHabitSchema, derivedFromTargetDays } from '@/lib/schemas/habits';
import { z } from 'zod';
import { logger } from '@/lib/logger';

type UpdateInput = z.infer<typeof updateHabitSchema>;

const FIELD_MAP: Record<string, string> = {
  name: 'name',
  description: 'description',
  color: 'color',
  isActive: 'is_active',
  sortOrder: 'sort_order',
  trackingType: 'tracking_type',
  targetValue: 'target_value',
  unit: 'unit',
  icon: 'icon',
  category: 'category',
  reminderTime: 'reminder_time',
};

function buildUpdatePayload(data: UpdateInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    const val = data[camel as keyof UpdateInput];
    if (val !== undefined) updates[snake] = val;
  }

  if (data.targetDays !== undefined) {
    const sorted = [...data.targetDays].sort((a, b) => a - b);
    const derived = derivedFromTargetDays(sorted);
    updates.target_days = sorted;
    updates.frequency = derived.frequency;
    updates.target_days_per_week = derived.targetDaysPerWeek;
  }

  return updates;
}

interface RouteParams {
  params: Promise<{ habitId: string }>;
}

async function verifyOwnership(habitId: string, userId: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(habitId)) {
    return { error: 'Invalid habit ID', status: 400 as const };
  }

  const { data: habit, error } = await supabaseAdmin
    .from('habits')
    .select('id, user_id')
    .eq('id', habitId)
    .maybeSingle();

  if (error) {
    logger.error('Error verifying habit ownership', { detail: error.message });
    return { error: 'Internal server error', status: 500 as const };
  }

  if (!habit) {
    return { error: 'Habit not found', status: 404 as const };
  }

  if (habit.user_id !== userId) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { habit };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const parsed = updateHabitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = buildUpdatePayload(parsed.data);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: habit, error: updateError } = await supabaseAdmin
      .from('habits')
      .update(updates)
      .eq('id', habitId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating habit', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
    }

    logger.info('Habit updated', { userId: session.user.id, habitId });
    return NextResponse.json({ habit });
  } catch (error) {
    logger.error('Error in habit PATCH', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    const { error: updateError } = await supabaseAdmin
      .from('habits')
      .update({ is_active: false })
      .eq('id', habitId);

    if (updateError) {
      logger.error('Error deleting habit', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
    }

    logger.info('Habit soft-deleted', { userId: session.user.id, habitId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in habit DELETE', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
