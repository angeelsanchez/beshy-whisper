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

    const { data: participation, error: findError } = await supabaseAdmin
      .from('initiative_participants')
      .select('id, is_active')
      .eq('initiative_id', initiativeId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (findError) {
      logger.error('Error finding participation', { detail: findError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!participation || !participation.is_active) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('initiative_participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('id', participation.id);

    if (updateError) {
      logger.error('Error leaving initiative', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to leave' }, { status: 500 });
    }

    const { data: initiative } = await supabaseAdmin
      .from('initiatives')
      .select('participant_count')
      .eq('id', initiativeId)
      .single();

    const newCount = Math.max(0, (initiative?.participant_count ?? 1) - 1);
    await supabaseAdmin
      .from('initiatives')
      .update({ participant_count: newCount })
      .eq('id', initiativeId);

    logger.info('User left initiative', { userId: session.user.id, initiativeId });
    return NextResponse.json({ action: 'left', participant_count: newCount });
  } catch (error) {
    logger.error('Error in initiative leave POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
