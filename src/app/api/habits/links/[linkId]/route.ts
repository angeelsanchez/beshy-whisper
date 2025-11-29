import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ linkId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linkId } = await params;
    if (!UUID_REGEX.test(linkId)) {
      return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 });
    }

    const userId = session.user.id;

    const { data: link, error: fetchError } = await supabaseAdmin
      .from('habit_links')
      .select('id, requester_id, responder_id, status')
      .eq('id', linkId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching link for delete', { detail: fetchError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const isRequester = link.requester_id === userId;
    const isResponder = link.responder_id === userId;

    if (!isRequester && !isResponder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (link.status === 'pending' && isRequester) {
      const { error: updateError } = await supabaseAdmin
        .from('habit_links')
        .update({ status: 'cancelled' })
        .eq('id', linkId);

      if (updateError) {
        logger.error('Error cancelling link', { detail: updateError.message });
        return NextResponse.json({ error: 'Failed to cancel link' }, { status: 500 });
      }
    } else {
      const { error: deleteError } = await supabaseAdmin
        .from('habit_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) {
        logger.error('Error deleting link', { detail: deleteError.message });
        return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
      }
    }

    logger.info('Habit link removed', { linkId, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in habit link DELETE', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
