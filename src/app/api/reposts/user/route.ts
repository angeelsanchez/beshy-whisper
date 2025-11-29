import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const userRepostsQuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

interface RepostEntryRow {
  id: string;
  created_at: string;
  entries: {
    id: string;
    user_id: string | null;
    nombre: string;
    mensaje: string;
    fecha: string;
    franja: 'DIA' | 'NOCHE';
    guest: boolean;
    is_private?: boolean;
    edited?: boolean;
    mood?: string | null;
    users?: {
      alias: string;
      name?: string;
      bsy_id?: string;
      profile_photo_url?: string | null;
    } | null;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const searchParams = request.nextUrl.searchParams;
    const parsed = userRepostsQuerySchema.safeParse({
      userId: searchParams.get('userId'),
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { userId, limit, offset } = parsed.data;

    if (!uuidSchema.safeParse(userId).success) {
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const { data, error, count } = await supabaseAdmin
      .from('reposts')
      .select(`
        id,
        created_at,
        entries:entry_id (
          id, user_id, nombre, mensaje, fecha, franja, guest, is_private, edited, mood,
          users:user_id (alias, name, bsy_id, profile_photo_url)
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching user reposts', { detail: error.message });
      return NextResponse.json(
        { error: 'Error al obtener reposts' },
        { status: 500 }
      );
    }

    const repostRows = (data as unknown as RepostEntryRow[]) || [];

    const formattedEntries = repostRows
      .filter(repost => {
        if (!repost.entries) return false;
        if (repost.entries.is_private && repost.entries.user_id !== currentUserId) return false;
        return true;
      })
      .map(repost => {
        const entry = repost.entries!;
        let display_id: string;
        let display_name: string;

        if (entry.user_id && entry.users?.alias) {
          display_id = entry.users.alias;
          display_name = entry.users.name || `Usuario ${entry.users.alias}`;
        } else {
          const guestName = entry.nombre?.trim() || 'Anónimo';
          display_id = `${guestName} (Invitado)`;
          display_name = guestName;
        }

        return {
          id: entry.id,
          user_id: entry.user_id,
          nombre: entry.nombre,
          mensaje: entry.mensaje,
          fecha: entry.fecha,
          franja: entry.franja,
          guest: entry.guest,
          is_private: entry.is_private,
          edited: entry.edited,
          mood: entry.mood,
          display_id,
          display_name,
          likes_count: 0,
          has_objectives: entry.franja === 'DIA',
          profile_photo_url: entry.users?.profile_photo_url ?? null,
          reposted_at: repost.created_at,
        };
      });

    return NextResponse.json({
      entries: formattedEntries,
      total: count ?? 0,
    });
  } catch (error) {
    logger.error('Unexpected error in user reposts API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
