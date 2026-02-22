import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { updateInitiativeSchema } from '@/lib/schemas/initiatives';
import { logger } from '@/lib/logger';
import { UUID_REGEX } from '@/lib/constants';
import { getTodayDate } from '@/utils/date-helpers';

interface RouteParams {
  params: Promise<{ initiativeId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const { data: initiative, error } = await supabaseAdmin
      .from('initiatives')
      .select('*')
      .eq('id', initiativeId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching initiative', { detail: error.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    const { data: participation } = await supabaseAdmin
      .from('initiative_participants')
      .select('id')
      .eq('initiative_id', initiativeId)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    const today = getTodayDate();
    const { data: todayLog } = await supabaseAdmin
      .from('initiative_logs')
      .select('value')
      .eq('initiative_id', initiativeId)
      .eq('user_id', session.user.id)
      .eq('completed_at', today)
      .maybeSingle();

    return NextResponse.json({
      initiative,
      is_joined: !!participation,
      user_checked_in_today: !!todayLog,
      user_today_value: todayLog?.value ?? null,
    });
  } catch (error) {
    logger.error('Error in initiative GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateInitiativeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const FIELD_MAP: Record<string, string> = {
      name: 'name',
      description: 'description',
      icon: 'icon',
      color: 'color',
      category: 'category',
      isActive: 'is_active',
      maxParticipants: 'max_participants',
      reminderTime: 'reminder_time',
    };

    const updates: Record<string, unknown> = {};
    for (const [camel, snake] of Object.entries(FIELD_MAP)) {
      const val = parsed.data[camel as keyof typeof parsed.data];
      if (val !== undefined) updates[snake] = val;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: initiative, error: updateError } = await supabaseAdmin
      .from('initiatives')
      .update(updates)
      .eq('id', initiativeId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating initiative', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 });
    }

    logger.info('Initiative updated', { userId: session.user.id, initiativeId });
    return NextResponse.json({ initiative });
  } catch (error) {
    logger.error('Error in initiative PATCH', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('initiatives')
      .update({ is_active: false })
      .eq('id', initiativeId);

    if (updateError) {
      logger.error('Error deleting initiative', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 });
    }

    logger.info('Initiative soft-deleted', { userId: session.user.id, initiativeId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in initiative DELETE', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
