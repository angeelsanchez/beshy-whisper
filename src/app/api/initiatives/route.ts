import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { createInitiativeSchema, initiativeListQuerySchema } from '@/lib/schemas/initiatives';
import { logger } from '@/lib/logger';
import { getTodayDate } from '@/utils/date-helpers';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = initiativeListQuerySchema.safeParse({
      joined: url.searchParams.get('joined') ?? undefined,
      page: url.searchParams.get('page') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { joined, page, limit } = parsed.data;
    const offset = (page - 1) * limit;
    const today = getTodayDate();

    let query = supabaseAdmin
      .from('initiatives')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (joined === 'true') {
      const { data: participantRows } = await supabaseAdmin
        .from('initiative_participants')
        .select('initiative_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      const joinedIds = (participantRows ?? []).map(r => r.initiative_id);
      if (joinedIds.length === 0) {
        return NextResponse.json({ initiatives: [], total: 0 });
      }
      query = query.in('id', joinedIds);
    }

    const { data: initiatives, error, count } = await query;

    if (error) {
      logger.error('Error fetching initiatives', { detail: error.message });
      return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 });
    }

    const { data: userParticipations } = await supabaseAdmin
      .from('initiative_participants')
      .select('initiative_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true);

    const joinedSet = new Set((userParticipations ?? []).map(p => p.initiative_id));

    const initiativeIds = (initiatives ?? []).map(i => i.id);

    const { data: todayLogs } = await supabaseAdmin
      .from('initiative_logs')
      .select('initiative_id, user_id')
      .in('initiative_id', initiativeIds.length > 0 ? initiativeIds : ['none'])
      .eq('completed_at', today);

    const todayLogsByInitiative = new Map<string, Set<string>>();
    for (const log of todayLogs ?? []) {
      const set = todayLogsByInitiative.get(log.initiative_id) ?? new Set();
      set.add(log.user_id);
      todayLogsByInitiative.set(log.initiative_id, set);
    }

    const enriched = (initiatives ?? []).map(init => {
      const todayUsers = todayLogsByInitiative.get(init.id);
      const completedCount = todayUsers?.size ?? 0;
      const totalParticipants = init.participant_count > 0 ? init.participant_count : 1;

      return {
        ...init,
        is_joined: joinedSet.has(init.id),
        today_completed: todayUsers?.has(session.user.id) ?? false,
        today_completion_rate: Math.round((completedCount / totalParticipants) * 100),
      };
    });

    return NextResponse.json({ initiatives: enriched, total: count ?? 0 });
  } catch (error) {
    logger.error('Error in initiatives GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createInitiativeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name, description, icon, color, category, trackingType,
      targetValue, unit, startDate, endDate, maxParticipants, reminderTime,
    } = parsed.data;

    const { data: initiative, error: insertError } = await supabaseAdmin
      .from('initiatives')
      .insert({
        creator_id: session.user.id,
        name,
        description,
        icon: icon ?? null,
        color,
        category: category ?? null,
        tracking_type: trackingType,
        target_value: trackingType !== 'binary' ? targetValue : null,
        unit: trackingType !== 'binary' ? unit : null,
        start_date: startDate,
        end_date: endDate ?? null,
        max_participants: maxParticipants ?? null,
        reminder_time: reminderTime ?? null,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating initiative', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 });
    }

    logger.info('Initiative created', { userId: session.user.id, initiativeId: initiative.id });
    return NextResponse.json({ initiative }, { status: 201 });
  } catch (error) {
    logger.error('Error in initiatives POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
