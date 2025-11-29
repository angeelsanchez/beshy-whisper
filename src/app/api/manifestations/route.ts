import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { createManifestationSchema } from '@/lib/schemas/manifestations';
import { logger } from '@/lib/logger';

const MAX_ACTIVE_MANIFESTATIONS = 5;

interface ManifestationRow {
  id: string;
  user_id: string;
  content: string;
  status: 'active' | 'fulfilled' | 'archived';
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ManifestationLogRow {
  manifestation_id: string;
  reaffirmed_at: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: manifestations, error } = await supabaseAdmin
      .from('manifestations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching manifestations', { detail: error.message });
      return NextResponse.json({ error: 'Failed to fetch manifestations' }, { status: 500 });
    }

    if (!manifestations || manifestations.length === 0) {
      return NextResponse.json({ manifestations: [] });
    }

    const manifestationIds = manifestations.map((m: ManifestationRow) => m.id);
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('manifestation_logs')
      .select('manifestation_id, reaffirmed_at')
      .in('manifestation_id', manifestationIds);

    if (logsError) {
      logger.error('Error fetching manifestation logs', { detail: logsError.message });
    }

    const today = new Date().toISOString().split('T')[0];
    const logsByManifestation = new Map<string, ManifestationLogRow[]>();
    for (const log of (logs ?? []) as ManifestationLogRow[]) {
      const existing = logsByManifestation.get(log.manifestation_id) ?? [];
      existing.push(log);
      logsByManifestation.set(log.manifestation_id, existing);
    }

    const enrichedManifestations = manifestations.map((m: ManifestationRow) => {
      const mLogs = logsByManifestation.get(m.id) ?? [];
      const reaffirmationCount = mLogs.length;
      const reaffirmedToday = mLogs.some((l) => l.reaffirmed_at === today);

      const createdDate = new Date(m.created_at);
      const nowDate = new Date();
      const diffTime = nowDate.getTime() - createdDate.getTime();
      const daysManifesting = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      return {
        id: m.id,
        content: m.content,
        status: m.status,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        fulfilledAt: m.fulfilled_at,
        daysManifesting,
        reaffirmationCount,
        reaffirmedToday,
      };
    });

    return NextResponse.json({ manifestations: enrichedManifestations });
  } catch (error) {
    logger.error('Error in manifestations GET', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createManifestationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from('manifestations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('status', 'active');

    if (countError) {
      logger.error('Error counting manifestations', { detail: countError.message });
      return NextResponse.json({ error: 'Failed to create manifestation' }, { status: 500 });
    }

    if ((count ?? 0) >= MAX_ACTIVE_MANIFESTATIONS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ACTIVE_MANIFESTATIONS} active manifestations allowed` },
        { status: 400 }
      );
    }

    const { content } = parsed.data;

    const { data: manifestation, error: insertError } = await supabaseAdmin
      .from('manifestations')
      .insert({
        user_id: session.user.id,
        content,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating manifestation', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to create manifestation' }, { status: 500 });
    }

    logger.info('Manifestation created', {
      userId: session.user.id,
      manifestationId: manifestation.id,
    });

    return NextResponse.json(
      {
        manifestation: {
          id: manifestation.id,
          content: manifestation.content,
          status: manifestation.status,
          createdAt: manifestation.created_at,
          updatedAt: manifestation.updated_at,
          fulfilledAt: manifestation.fulfilled_at,
          daysManifesting: 1,
          reaffirmationCount: 0,
          reaffirmedToday: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error in manifestations POST', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
