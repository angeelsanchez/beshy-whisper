import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { repostStatusSchema } from '@/lib/schemas/reposts';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = repostStatusSchema.safeParse({ entryId: searchParams.get('entryId') });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { entryId } = parsed.data;

    const userId = session.user.id;

    if (!userId || !uuidSchema.safeParse(userId).success) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const [repostCheck, countResult] = await Promise.all([
      supabaseAdmin
        .from('reposts')
        .select('id')
        .eq('user_id', userId)
        .eq('entry_id', entryId)
        .maybeSingle(),
      supabaseAdmin
        .from('reposts')
        .select('id', { count: 'exact' })
        .eq('entry_id', entryId),
    ]);

    if (repostCheck.error) {
      logger.error('Error checking repost status', { detail: repostCheck.error.message });
      return NextResponse.json(
        { error: 'Error al verificar estado de repost' },
        { status: 500 }
      );
    }

    if (countResult.error) {
      logger.error('Error getting repost count', { detail: countResult.error.message });
      return NextResponse.json(
        { error: 'Error al obtener conteo de reposts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reposted: !!repostCheck.data,
      count: countResult.count ?? 0,
    });
  } catch (error) {
    logger.error('Unexpected error in repost status API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
