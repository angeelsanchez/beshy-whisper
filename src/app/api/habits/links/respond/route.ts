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

    const { linkId, action, responderHabitId } = parsed.data;
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

    if (action === 'accept' && responderHabitId) {
      const { data: habit } = await supabaseAdmin
        .from('habits')
        .select('id, user_id')
        .eq('id', responderHabitId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!habit) {
        return NextResponse.json({ error: 'Habit not found or not yours' }, { status: 404 });
      }
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const updateData: Record<string, unknown> = {
      status: newStatus,
      responded_at: new Date().toISOString(),
    };
    if (action === 'accept' && responderHabitId) {
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
    const actionLabel = action === 'accept' ? 'ha aceptado' : 'ha rechazado';
    sendPushToUserIfEnabled(link.requester_id, {
      title: `${responderName} ${actionLabel} tu solicitud de vínculo`,
      body: action === 'accept' ? 'Ya pueden ver el progreso del otro' : 'Puedes enviar otra solicitud más adelante',
      tag: 'habit-link-response',
      data: { url: '/habits', type: 'habit_link_response' },
    }, 'habit_link_response').catch(() => {});

    logger.info('Habit link responded', { linkId, action, userId });
    return NextResponse.json({ status: newStatus });
  } catch (error) {
    logger.error('Error in habit link respond', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
