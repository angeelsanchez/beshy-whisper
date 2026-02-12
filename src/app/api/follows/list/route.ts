import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { followListSchema } from '@/lib/schemas/follows';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = followListSchema.safeParse({
      userId: searchParams.get('userId'),
      type: searchParams.get('type'),
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, type, page, limit } = parsed.data;
    const offset = (page - 1) * limit;
    const currentUserId = session.user.id;

    if (type === 'followers') {
      const { data: follows, error, count } = await supabaseAdmin
        .from('follows')
        .select('follower_id, users!follows_follower_id_fkey(id, alias, bsy_id, name)', { count: 'exact' })
        .eq('following_id', userId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching followers', { detail: error.message });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      const followerIds = (follows || []).map(f => f.follower_id);
      let followedByMe = new Set<string>();

      if (followerIds.length > 0) {
        const { data: myFollows } = await supabaseAdmin
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', followerIds);

        followedByMe = new Set((myFollows || []).map(f => f.following_id));
      }

      const users = (follows || []).map(f => {
        const user = f.users as unknown as { id: string; alias: string; bsy_id: string; name: string } | null;
        return {
          id: user?.id || f.follower_id,
          alias: user?.alias || '',
          bsy_id: user?.bsy_id || '',
          name: user?.name || '',
          isFollowedByMe: followedByMe.has(f.follower_id),
        };
      });

      return NextResponse.json({ users, total: count || 0, page, limit });
    }

    const { data: follows, error, count } = await supabaseAdmin
      .from('follows')
      .select('following_id, users!follows_following_id_fkey(id, alias, bsy_id, name)', { count: 'exact' })
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching following', { detail: error.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const followingIds = (follows || []).map(f => f.following_id);
    let followedByMe = new Set<string>();

    if (followingIds.length > 0 && currentUserId !== userId) {
      const { data: myFollows } = await supabaseAdmin
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', followingIds);

      followedByMe = new Set((myFollows || []).map(f => f.following_id));
    } else if (currentUserId === userId) {
      followedByMe = new Set(followingIds);
    }

    const users = (follows || []).map(f => {
      const user = f.users as unknown as { id: string; alias: string; bsy_id: string; name: string } | null;
      return {
        id: user?.id || f.following_id,
        alias: user?.alias || '',
        bsy_id: user?.bsy_id || '',
        name: user?.name || '',
        isFollowedByMe: followedByMe.has(f.following_id),
      };
    });

    return NextResponse.json({ users, total: count || 0, page, limit });
  } catch (error) {
    logger.error('Error in follow list API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
