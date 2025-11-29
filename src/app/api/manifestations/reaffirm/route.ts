import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { reaffirmManifestationsSchema } from '@/lib/schemas/manifestations';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reaffirmManifestationsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { manifestationIds, entryId } = parsed.data;

    const { data: manifestations, error: fetchError } = await supabaseAdmin
      .from('manifestations')
      .select('id, user_id, status')
      .in('id', manifestationIds);

    if (fetchError) {
      logger.error('Error fetching manifestations for reaffirm', { detail: fetchError.message });
      return NextResponse.json({ error: 'Failed to reaffirm manifestations' }, { status: 500 });
    }

    const validIds: string[] = [];
    for (const m of manifestations ?? []) {
      if (m.user_id !== session.user.id) {
        continue;
      }
      if (m.status !== 'active') {
        continue;
      }
      validIds.push(m.id);
    }

    if (validIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid active manifestations to reaffirm' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const logsToInsert = validIds.map((id) => ({
      manifestation_id: id,
      user_id: session.user.id,
      reaffirmed_at: today,
      entry_id: entryId ?? null,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('manifestation_logs')
      .upsert(logsToInsert, {
        onConflict: 'manifestation_id,reaffirmed_at',
        ignoreDuplicates: true,
      });

    if (insertError) {
      logger.error('Error inserting manifestation logs', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to reaffirm manifestations' }, { status: 500 });
    }

    logger.info('Manifestations reaffirmed', {
      userId: session.user.id,
      count: validIds.length,
      entryId: entryId ?? null,
    });

    return NextResponse.json({
      reaffirmed: validIds.length,
      manifestationIds: validIds,
    });
  } catch (error) {
    logger.error('Error in manifestations reaffirm POST', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
