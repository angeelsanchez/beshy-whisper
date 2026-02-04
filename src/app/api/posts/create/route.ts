import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { createPostSchema } from '@/lib/schemas/posts';
import { logger } from '@/lib/logger';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';

async function notifyFollowers(userId: string, userName: string, entryId: string) {
  try {
    const { data: followers, error: followError } = await supabaseAdmin
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (followError || !followers?.length) return;

    const followerIds = followers.map(f => f.follower_id);

    const sendPromises = followerIds.map(followerId =>
      sendPushToUserIfEnabled(followerId, {
        title: `✨ ${userName} ha publicado un nuevo whisper`,
        body: 'Echa un vistazo a lo que ha compartido',
        tag: 'follow-post-notification',
        data: { url: `/feed?highlight=${entryId}`, type: 'follow_post' },
      }, 'follow_post').catch(() => {})
    );

    await Promise.allSettled(sendPromises);
    logger.info('Follow post notifications sent', { userId, followerCount: followerIds.length });
  } catch (error) {
    logger.error('Error notifying followers', { detail: error instanceof Error ? error.message : String(error) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { mensaje, franja, is_private, objectives, mood } = parsed.data;
    const userId = session.user.id;
    const userName = session.user.name || session.user.alias || 'Alguien';

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: existingPosts, error: checkError } = await supabaseAdmin
      .from('entries')
      .select('id')
      .eq('user_id', userId)
      .eq('franja', franja)
      .gte('fecha', startOfDay.toISOString())
      .lt('fecha', endOfDay.toISOString());

    if (checkError) {
      logger.error('Error checking existing posts', { detail: checkError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (existingPosts && existingPosts.length > 0) {
      return NextResponse.json({ error: `Ya has publicado tu whisper de ${franja === 'DIA' ? 'día' : 'noche'} hoy` }, { status: 409 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const { data: entry, error: insertError } = await supabaseAdmin
      .from('entries')
      .insert({
        user_id: userId,
        nombre: session.user.name || '',
        mensaje,
        fecha: new Date().toISOString(),
        ip,
        franja,
        guest: false,
        is_private,
        mood: mood ?? null,
      })
      .select()
      .single();

    if (insertError || !entry) {
      logger.error('Error creating post', { detail: insertError?.message || 'No data returned' });
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    let savedObjectives: unknown[] = [];
    if (franja === 'DIA' && objectives.length > 0) {
      const objectivesData = objectives.map(text => ({
        entry_id: entry.id,
        user_id: userId,
        text,
        done: false,
      }));

      const { data: objData, error: objError } = await supabaseAdmin
        .from('objectives')
        .insert(objectivesData)
        .select();

      if (objError) {
        logger.error('Error saving objectives', { detail: objError.message });
      } else {
        savedObjectives = objData || [];
      }
    }

    if (!is_private) {
      notifyFollowers(userId, userName, entry.id).catch(err => {
        logger.error('Error in follow notification', { detail: err instanceof Error ? err.message : String(err) });
      });
    }

    logger.info('Post created', { userId, entryId: entry.id, franja });
    return NextResponse.json({ entry, objectives: savedObjectives }, { status: 201 });
  } catch (error) {
    logger.error('Error in posts/create API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
