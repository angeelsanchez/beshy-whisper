import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { fulfillManifestationSchema } from '@/lib/schemas/manifestations';
import { logger } from '@/lib/logger';
import { UUID_REGEX } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = fulfillManifestationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { manifestationId } = parsed.data;

    if (!UUID_REGEX.test(manifestationId)) {
      return NextResponse.json({ error: 'Invalid manifestation ID' }, { status: 400 });
    }

    const { data: manifestation, error: fetchError } = await supabaseAdmin
      .from('manifestations')
      .select('id, user_id, status, content, created_at')
      .eq('id', manifestationId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching manifestation for fulfill', { detail: fetchError.message });
      return NextResponse.json({ error: 'Failed to fulfill manifestation' }, { status: 500 });
    }

    if (!manifestation) {
      return NextResponse.json({ error: 'Manifestation not found' }, { status: 404 });
    }

    if (manifestation.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (manifestation.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active manifestations can be fulfilled' },
        { status: 400 }
      );
    }

    const fulfilledAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('manifestations')
      .update({
        status: 'fulfilled',
        fulfilled_at: fulfilledAt,
      })
      .eq('id', manifestationId);

    if (updateError) {
      logger.error('Error fulfilling manifestation', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to fulfill manifestation' }, { status: 500 });
    }

    const { data: logs } = await supabaseAdmin
      .from('manifestation_logs')
      .select('id')
      .eq('manifestation_id', manifestationId);

    const reaffirmationCount = logs?.length ?? 0;

    const createdDate = new Date(manifestation.created_at);
    const nowDate = new Date();
    const diffTime = nowDate.getTime() - createdDate.getTime();
    const daysManifesting = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    logger.info('Manifestation fulfilled', {
      userId: session.user.id,
      manifestationId,
      daysManifesting,
      reaffirmationCount,
    });

    return NextResponse.json({
      manifestation: {
        id: manifestation.id,
        content: manifestation.content,
        status: 'fulfilled',
        createdAt: manifestation.created_at,
        fulfilledAt,
        daysManifesting,
        reaffirmationCount,
      },
    });
  } catch (error) {
    logger.error('Error in manifestation fulfill POST', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
