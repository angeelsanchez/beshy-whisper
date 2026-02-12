import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { userSearchSchema } from '@/lib/schemas/search';
import { logger } from '@/lib/logger';

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = userSearchSchema.safeParse({
      q: searchParams.get('q'),
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { q, page, limit } = parsed.data;
    const offset = (page - 1) * limit;
    const currentUserId = session.user.id;
    const pattern = `%${escapeLikePattern(q)}%`;

    const { data: users, error, count } = await supabaseAdmin
      .from('users')
      .select('id, alias, bsy_id, name, profile_photo_url, bio', { count: 'exact' })
      .or(`name.ilike.${pattern},alias.ilike.${pattern},bsy_id.ilike.${pattern}`)
      .neq('id', currentUserId)
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error searching users', { detail: error.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    const userIds = (users ?? []).map(u => u.id);
    let followedByMe = new Set<string>();

    if (userIds.length > 0) {
      const { data: myFollows } = await supabaseAdmin
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', userIds);

      followedByMe = new Set((myFollows ?? []).map(f => f.following_id));
    }

    const results = (users ?? []).map(user => ({
      id: user.id,
      alias: user.alias ?? '',
      bsy_id: user.bsy_id ?? '',
      name: user.name ?? '',
      profile_photo_url: user.profile_photo_url ?? null,
      bio: user.bio ?? null,
      isFollowedByMe: followedByMe.has(user.id),
    }));

    return NextResponse.json({ users: results, total: count ?? 0, page, limit });
  } catch (error) {
    logger.error('Error in user search API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
