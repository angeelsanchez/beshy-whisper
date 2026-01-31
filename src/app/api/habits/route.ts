import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../auth/[...nextauth]/auth';
import { createHabitSchema } from '@/lib/schemas/habits';
import { logger } from '@/lib/logger';

const MAX_HABITS_PER_USER = 20;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: habits, error } = await supabaseAdmin
      .from('habits')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching habits', { detail: error.message });
      return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
    }

    return NextResponse.json({ habits: habits ?? [] });
  } catch (error) {
    logger.error('Error in habits GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createHabitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    if (countError) {
      logger.error('Error counting habits', { detail: countError.message });
      return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
    }

    if ((count ?? 0) >= MAX_HABITS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_HABITS_PER_USER} active habits allowed` },
        { status: 400 }
      );
    }

    const { name, description, frequency, targetDaysPerWeek, color } = parsed.data;

    const { data: habit, error: insertError } = await supabaseAdmin
      .from('habits')
      .insert({
        user_id: session.user.id,
        name,
        description: description ?? null,
        frequency,
        target_days_per_week: targetDaysPerWeek,
        color,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating habit', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
    }

    logger.info('Habit created', { userId: session.user.id, habitId: habit.id });
    return NextResponse.json({ habit }, { status: 201 });
  } catch (error) {
    logger.error('Error in habits POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
