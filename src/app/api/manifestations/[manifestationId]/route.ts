import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { updateManifestationSchema } from '@/lib/schemas/manifestations';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ manifestationId: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ManifestationOwnershipResult {
  manifestation: {
    id: string;
    user_id: string;
    status: string;
  };
}

interface ManifestationOwnershipError {
  error: string;
  status: 400 | 403 | 404 | 500;
}

async function verifyOwnership(
  manifestationId: string,
  userId: string
): Promise<ManifestationOwnershipResult | ManifestationOwnershipError> {
  if (!UUID_REGEX.test(manifestationId)) {
    return { error: 'Invalid manifestation ID', status: 400 };
  }

  const { data: manifestation, error } = await supabaseAdmin
    .from('manifestations')
    .select('id, user_id, status')
    .eq('id', manifestationId)
    .maybeSingle();

  if (error) {
    logger.error('Error verifying manifestation ownership', { detail: error.message });
    return { error: 'Internal server error', status: 500 };
  }

  if (!manifestation) {
    return { error: 'Manifestation not found', status: 404 };
  }

  if (manifestation.user_id !== userId) {
    return { error: 'Forbidden', status: 403 };
  }

  return { manifestation };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { manifestationId } = await params;
    const ownership = await verifyOwnership(manifestationId, session.user.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const { data: manifestation, error } = await supabaseAdmin
      .from('manifestations')
      .select('*')
      .eq('id', manifestationId)
      .single();

    if (error) {
      logger.error('Error fetching manifestation', { detail: error.message });
      return NextResponse.json({ error: 'Failed to fetch manifestation' }, { status: 500 });
    }

    const { data: logs } = await supabaseAdmin
      .from('manifestation_logs')
      .select('reaffirmed_at')
      .eq('manifestation_id', manifestationId);

    const today = new Date().toISOString().split('T')[0];
    const reaffirmationCount = logs?.length ?? 0;
    const reaffirmedToday = logs?.some((l) => l.reaffirmed_at === today) ?? false;

    const createdDate = new Date(manifestation.created_at);
    const nowDate = new Date();
    const diffTime = nowDate.getTime() - createdDate.getTime();
    const daysManifesting = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      manifestation: {
        id: manifestation.id,
        content: manifestation.content,
        status: manifestation.status,
        createdAt: manifestation.created_at,
        updatedAt: manifestation.updated_at,
        fulfilledAt: manifestation.fulfilled_at,
        daysManifesting,
        reaffirmationCount,
        reaffirmedToday,
      },
    });
  } catch (error) {
    logger.error('Error in manifestation GET', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { manifestationId } = await params;
    const ownership = await verifyOwnership(manifestationId, session.user.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const body = await request.json();
    const parsed = updateManifestationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.content !== undefined) {
      updates.content = parsed.data.content;
    }
    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
      if (parsed.data.status === 'fulfilled') {
        updates.fulfilled_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: manifestation, error: updateError } = await supabaseAdmin
      .from('manifestations')
      .update(updates)
      .eq('id', manifestationId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating manifestation', { detail: updateError.message });
      return NextResponse.json({ error: 'Failed to update manifestation' }, { status: 500 });
    }

    logger.info('Manifestation updated', {
      userId: session.user.id,
      manifestationId,
      newStatus: parsed.data.status,
    });

    return NextResponse.json({ manifestation });
  } catch (error) {
    logger.error('Error in manifestation PATCH', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { manifestationId } = await params;
    const ownership = await verifyOwnership(manifestationId, session.user.id);
    if ('error' in ownership) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    if (ownership.manifestation.status === 'fulfilled') {
      return NextResponse.json(
        { error: 'Cannot delete a fulfilled manifestation' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('manifestations')
      .delete()
      .eq('id', manifestationId);

    if (deleteError) {
      logger.error('Error deleting manifestation', { detail: deleteError.message });
      return NextResponse.json({ error: 'Failed to delete manifestation' }, { status: 500 });
    }

    logger.info('Manifestation deleted', { userId: session.user.id, manifestationId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in manifestation DELETE', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
