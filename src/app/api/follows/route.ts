import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { toggleFollowSchema } from '@/lib/schemas/follows';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

async function sendFollowNotification(followerId: string, targetUserId: string): Promise<void> {
  const { data: followerData, error: followerError } = await supabaseAdmin
    .from('users')
    .select('bsy_id, name')
    .eq('id', followerId)
    .single();

  if (followerError || !followerData) {
    logger.error('Error fetching follower data for notification', { detail: followerError?.message || String(followerError) });
    return;
  }

  const followerName = followerData.name || followerData.bsy_id || 'Alguien';

  await sendPushToUserIfEnabled(targetUserId, {
    title: '👤 Nuevo seguidor',
    body: `${followerName} ha empezado a seguirte`,
    tag: 'follow-notification',
    data: {
      url: '/profile',
      type: 'follow',
      follower_user_id: followerId,
      follower_name: followerName,
    },
  }, 'follow');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = toggleFollowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { targetUserId } = parsed.data;
    const userId = session.user.id;

    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: existingFollow, error: checkError } = await supabaseAdmin
      .from('follows')
      .select('follower_id')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking follow status', { detail: checkError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (existingFollow) {
      const { error: deleteError } = await supabaseAdmin
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);

      if (deleteError) {
        logger.error('Error unfollowing', { detail: deleteError.message });
        return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
      }

      logger.info('User unfollowed', { userId, targetUserId });
      return NextResponse.json({ action: 'unfollowed', isFollowing: false });
    }

    const { error: insertError } = await supabaseAdmin
      .from('follows')
      .insert({ follower_id: userId, following_id: targetUserId });

    if (insertError) {
      logger.error('Error following', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
    }

    logger.info('User followed', { userId, targetUserId });

    sendFollowNotification(userId, targetUserId).catch(err => {
      logger.error('Failed to send follow notification', { detail: err instanceof Error ? err.message : String(err) });
    });

    return NextResponse.json({ action: 'followed', isFollowing: true });
  } catch (error) {
    logger.error('Error in follows API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
