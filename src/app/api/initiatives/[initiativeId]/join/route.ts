import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../../auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { UUID_REGEX } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ initiativeId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const { data: initiative, error: initError } = await supabaseAdmin
      .from('initiatives')
      .select('id, is_active, max_participants, participant_count')
      .eq('id', initiativeId)
      .maybeSingle();

    if (initError || !initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    if (!initiative.is_active) {
      return NextResponse.json({ error: 'Initiative is not active' }, { status: 400 });
    }

    if (initiative.max_participants && initiative.participant_count >= initiative.max_participants) {
      return NextResponse.json({ error: 'Initiative is full' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('initiative_participants')
      .select('id, is_active')
      .eq('initiative_id', initiativeId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existing?.is_active) {
      return NextResponse.json({ error: 'Already joined' }, { status: 400 });
    }

    if (existing && !existing.is_active) {
      const { error: rejoinError } = await supabaseAdmin
        .from('initiative_participants')
        .update({ is_active: true, left_at: null })
        .eq('id', existing.id);

      if (rejoinError) {
        logger.error('Error rejoining initiative', { detail: rejoinError.message });
        return NextResponse.json({ error: 'Failed to join' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('initiative_participants')
        .insert({ initiative_id: initiativeId, user_id: session.user.id });

      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({ error: 'Already joined' }, { status: 400 });
        }
        logger.error('Error joining initiative', { detail: insertError.message });
        return NextResponse.json({ error: 'Failed to join' }, { status: 500 });
      }
    }

    await supabaseAdmin
      .from('initiatives')
      .update({ participant_count: initiative.participant_count + 1 })
      .eq('id', initiativeId);

    const newCount = initiative.participant_count + 1;
    logger.info('User joined initiative', { userId: session.user.id, initiativeId });
    return NextResponse.json({ action: 'joined', participant_count: newCount });
  } catch (error) {
    logger.error('Error in initiative join POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
