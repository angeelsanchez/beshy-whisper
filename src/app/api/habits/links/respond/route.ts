import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { respondHabitLinkSchema } from '@/lib/schemas/habit-links';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = respondHabitLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { linkId, action } = parsed.data;
    const userId = session.user.id;

    const { data: link, error: linkError } = await supabaseAdmin
      .from('habit_links')
      .select('id, requester_id, responder_id, status, requester_habit_id')
      .eq('id', linkId)
      .maybeSingle();

    if (linkError) {
      logger.error('Error fetching link for response', { detail: linkError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }
    if (link.responder_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (link.status !== 'pending') {
      return NextResponse.json({ error: 'Link already responded to' }, { status: 409 });
    }

    let responderHabitId: string | null = null;

    if (action === 'accept') {
      const { data: sourceHabit, error: habitError } = await supabaseAdmin
        .from('habits')
        .select('*')
        .eq('id', link.requester_habit_id)
        .maybeSingle();

      if (habitError) {
        logger.error('Error fetching source habit', { detail: habitError.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
      if (!sourceHabit) {
        return NextResponse.json({ error: 'Source habit no longer exists' }, { status: 404 });
      }

      const { data: existingHabit } = await supabaseAdmin
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('name', sourceHabit.name)
        .maybeSingle();

      if (existingHabit) {
        return NextResponse.json(
          { error: 'Ya tienes un hábito con ese nombre' },
          { status: 409 }
        );
      }

      const { count: habitCount } = await supabaseAdmin
        .from('habits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const newSortOrder = (habitCount ?? 0) + 1;

      const { data: newHabit, error: insertError } = await supabaseAdmin
        .from('habits')
        .insert({
          user_id: userId,
          name: sourceHabit.name,
          description: sourceHabit.description,
          frequency: sourceHabit.frequency,
          frequency_mode: sourceHabit.frequency_mode,
          target_days_per_week: sourceHabit.target_days_per_week,
          target_days: sourceHabit.target_days,
          weekly_target: sourceHabit.weekly_target,
          color: sourceHabit.color,
          tracking_type: sourceHabit.tracking_type,
          target_value: sourceHabit.target_value,
          unit: sourceHabit.unit,
          icon: sourceHabit.icon,
          category: sourceHabit.category,
          reminder_time: null,
          has_progression: false,
          current_level: null,
          level_started_at: null,
          is_shareable: true,
          is_active: true,
          sort_order: newSortOrder,
        })
        .select('id')
        .single();

      if (insertError) {
        logger.error('Error creating habit copy for responder', { detail: insertError.message });
        return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
      }

      responderHabitId = newHabit.id;
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const updateData: Record<string, unknown> = {
      status: newStatus,
      responded_at: new Date().toISOString(),
    };
    if (responderHabitId) {
      updateData.responder_habit_id = responderHabitId;
    }

    const { error: updateError } = await supabaseAdmin
      .from('habit_links')
      .update(updateData)
      .eq('id', linkId);

    if (updateError) {
      logger.error('Error updating link status', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
    }

    const responderName = session.user.name || session.user.alias || 'Alguien';
    const actionLabel = action === 'accept' ? 'se ha unido a' : 'ha rechazado';
    sendPushToUserIfEnabled(link.requester_id, {
      title: `${responderName} ${actionLabel} tu hábito`,
      body: action === 'accept' ? 'Ya estáis haciendo este hábito juntos' : 'Puedes invitar a otra persona',
      tag: 'habit-link-response',
      data: { url: '/habits', type: 'habit_link_response' },
    }, 'habit_link_response').catch(() => {});

    logger.info('Habit link responded', { linkId, action, userId, responderHabitId });
    return NextResponse.json({ status: newStatus, habitCreated: responderHabitId !== null });
  } catch (error) {
    logger.error('Error in habit link respond', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
