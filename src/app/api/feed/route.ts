import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const feedQuerySchema = z.object({
  filter: z.enum(['all', 'following']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    const parsed = feedQuerySchema.safeParse({
      filter: searchParams.get('filter') || 'all',
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const { filter, limit, offset } = parsed.data;
    const currentUserId = session?.user?.id;

    if (filter === 'following') {
      if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: followingList, error: followError } = await supabaseAdmin
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (followError) {
        logger.error('Error fetching following list', { detail: followError.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      const followingIds = (followingList || []).map(f => f.following_id);

      if (followingIds.length === 0) {
        return NextResponse.json({ entries: [], total: 0 });
      }

      const { data: entries, error: entriesError, count } = await supabaseAdmin
        .from('entries')
        .select(`*, users:user_id (alias, name, bsy_id, profile_photo_url)`, { count: 'exact' })
        .in('user_id', followingIds)
        .eq('is_private', false)
        .eq('guest', false)
        .order('fecha', { ascending: false })
        .range(offset, offset + limit - 1);

      if (entriesError) {
        logger.error('Error fetching following feed', { detail: entriesError.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      const { data: repostRows, error: repostError } = await supabaseAdmin
        .from('reposts')
        .select(`
          id,
          user_id,
          created_at,
          users:user_id (alias, name, bsy_id, profile_photo_url),
          entries:entry_id (*, users:user_id (alias, name, bsy_id, profile_photo_url))
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (repostError) {
        logger.warn('Error fetching reposts for following feed', { detail: repostError.message });
      }

      const formattedEntries = formatEntries(entries || [], currentUserId);

      const existingEntryIds = new Set(formattedEntries.map(e => e.id));
      const typedRepostRows = (repostRows || []) as unknown as RepostRow[];
      const repostEntries = typedRepostRows
        .filter(r => r.entries && !r.entries.is_private && !existingEntryIds.has(r.entries.id))
        .map(r => {
          const entry = r.entries!;
          const reposterUser = r.users;
          const reposterName = reposterUser?.name || reposterUser?.alias || 'Alguien';

          return {
            ...formatEntries([entry], currentUserId)[0],
            is_repost: true,
            reposted_by: {
              user_id: r.user_id,
              display_name: reposterName,
              reposted_at: r.created_at,
            },
            sort_date: r.created_at,
          };
        });

      const merged = [...formattedEntries.map(e => ({ ...e, sort_date: e.fecha })), ...repostEntries]
        .sort((a, b) => new Date(b.sort_date).getTime() - new Date(a.sort_date).getTime())
        .slice(0, limit);

      return NextResponse.json({ entries: merged, total: (count || 0) + repostEntries.length });
    }

    const { data: entries, error: entriesError, count } = await supabaseAdmin
      .from('entries')
      .select(`*, users:user_id (alias, name, bsy_id, profile_photo_url)`, { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entriesError) {
      logger.error('Error fetching feed', { detail: entriesError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const filteredEntries = (entries || []).filter(entry =>
      !entry.is_private || entry.user_id === currentUserId
    );

    const formattedEntries = formatEntries(filteredEntries, currentUserId);
    return NextResponse.json({ entries: formattedEntries, total: count || 0 });
  } catch (error) {
    logger.error('Error in feed API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface RepostRow {
  id: string;
  user_id: string;
  created_at: string;
  users?: { alias: string; name?: string; bsy_id?: string; profile_photo_url?: string | null } | null;
  entries: EntryRow | null;
}

interface EntryRow {
  id: string;
  user_id: string | null;
  nombre: string;
  mensaje: string;
  fecha: string;
  ip: string;
  franja: 'DIA' | 'NOCHE';
  guest: boolean;
  is_private?: boolean;
  edited?: boolean;
  users?: { alias: string; name?: string; bsy_id?: string; profile_photo_url?: string | null } | null;
}

function formatEntries(entries: EntryRow[], currentUserId?: string) {
  return entries.map(entry => {
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
      display_id,
      display_name,
      likes_count: 0,
      reposts_count: 0,
      has_objectives: entry.franja === 'DIA',
      is_own: entry.user_id === currentUserId,
      profile_photo_url: entry.users?.profile_photo_url ?? null,
    };
  });
}
