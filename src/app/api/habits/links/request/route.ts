import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { requestHabitLinkSchema } from '@/lib/schemas/habit-links';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

const MAX_ACTIVE_LINKS = 10;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestHabitLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { responderId, requesterHabitId, message } = parsed.data;
    const requesterId = session.user.id;

    if (requesterId === responderId) {
      return NextResponse.json({ error: 'Cannot link with yourself' }, { status: 400 });
    }

    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('id, user_id, name')
      .eq('id', requesterHabitId)
      .eq('user_id', requesterId)
      .maybeSingle();

    if (habitError) {
      logger.error('Error verifying habit ownership for link', { detail: habitError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!habit) {
      return NextResponse.json({ error: 'Habit not found or not yours' }, { status: 404 });
    }

    const { data: responderUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', responderId)
      .maybeSingle();

    if (!responderUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { count: activeCount } = await supabaseAdmin
      .from('habit_links')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', requesterId)
      .in('status', ['pending', 'accepted']);

    if ((activeCount ?? 0) >= MAX_ACTIVE_LINKS) {
      return NextResponse.json(
        { error: 'Maximum active links reached' },
        { status: 429 }
      );
    }

    const { data: existingLink } = await supabaseAdmin
      .from('habit_links')
      .select('id')
      .eq('requester_id', requesterId)
      .eq('responder_id', responderId)
      .eq('requester_habit_id', requesterHabitId)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json({ error: 'Link already exists for this habit' }, { status: 409 });
    }

    const { data: link, error: insertError } = await supabaseAdmin
      .from('habit_links')
      .insert({
        requester_id: requesterId,
        responder_id: responderId,
        requester_habit_id: requesterHabitId,
        message: message ?? null,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating habit link', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to create link request' }, { status: 500 });
    }

    const requesterName = session.user.name || session.user.alias || 'Alguien';
    sendPushToUserIfEnabled(responderId, {
      title: `${requesterName} te invita a un hábito`,
      body: message ? `"${message}" — ${habit.name}` : `Únete a: ${habit.name}`,
      tag: 'habit-link-request',
      data: { url: '/habits', type: 'habit_link_request' },
    }, 'habit_link_request').catch(() => {});

    logger.info('Habit link requested', { requesterId, responderId, linkId: link.id });
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    logger.error('Error in habit link request', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
