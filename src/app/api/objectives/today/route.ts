import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  franja: z.enum(['DIA', 'NOCHE']).default('DIA'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      franja: searchParams.get('franja'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetro franja inválido' },
        { status: 400 }
      );
    }

    const { franja } = parsed.data;
    const userId = session.user.id;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const { data: entry, error: entryError } = await supabaseAdmin
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('franja', franja)
      .eq('guest', false)
      .gte('fecha', startOfDay.toISOString())
      .lt('fecha', endOfDay.toISOString())
      .single();

    if (entryError && entryError.code !== 'PGRST116') {
      logger.error('Error fetching entry', { detail: entryError.message });
      return NextResponse.json(
        { error: 'Error al cargar la entrada' },
        { status: 500 }
      );
    }

    if (!entry) {
      return NextResponse.json({
        success: true,
        objectives: [],
        message: `No tienes un whisper de ${franja === 'DIA' ? 'día' : 'noche'} hoy`,
      });
    }

    const { data: objectives, error: objError } = await supabaseAdmin
      .from('objectives')
      .select('id, text, done')
      .eq('entry_id', entry.id)
      .order('created_at', { ascending: true });

    if (objError) {
      logger.error('Error fetching objectives', { detail: objError.message });
      return NextResponse.json(
        { error: 'Error al cargar los objetivos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      objectives: objectives || [],
      entryId: entry.id,
    });
  } catch (error) {
    logger.error('Error in objectives today API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
