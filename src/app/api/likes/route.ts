import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../auth/[...nextauth]/auth';
import { toggleLikeSchema } from '@/lib/schemas/likes';
import { uuidSchema } from '@/lib/schemas/common';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';
import { incrementCachedLikesCount, decrementCachedLikesCount, invalidateLikesCount } from '@/lib/cache/counters';

async function sendLikeNotification(entryId: string, likerUserId: string): Promise<void> {
  const { data: entryData, error: entryError } = await supabaseAdmin
    .from('entries')
    .select('user_id')
    .eq('id', entryId)
    .single();

  if (entryError || !entryData) {
    logger.error('Error fetching entry for notification', { detail: entryError?.message || String(entryError) });
    return;
  }

  if (entryData.user_id === likerUserId) return;

  const { data: likerData, error: likerError } = await supabaseAdmin
    .from('users')
    .select('bsy_id, name')
    .eq('id', likerUserId)
    .single();

  if (likerError || !likerData) {
    logger.error('Error fetching liker data', { detail: likerError?.message || String(likerError) });
    return;
  }

  const likerName = likerData.name || likerData.bsy_id || 'Alguien';

  await sendPushToUserIfEnabled(entryData.user_id, {
    title: '❤️ Nuevo like en tu Whisper',
    body: `${likerName} le dio like a tu whisper`,
    tag: 'like-notification',
    data: {
      url: `/feed?highlight=${entryId}`,
      type: 'like',
      entry_id: entryId,
      liker_user_id: likerUserId,
      liker_name: likerName,
    },
  }, 'like');
}

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No session or user' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const parsed = toggleLikeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    const { entryId } = parsed.data;

    const userId = session.user.id;

    // Validate user ID
    if (!userId) {
      logger.error('User ID missing in session', { userId: String(session.user?.id) });
      return NextResponse.json(
        { error: 'Unauthorized - User ID missing in session' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      logger.error('Invalid user ID', { userId });
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    logger.info('Processing like toggle action', { userId, entryId });
    
    try {
      // Use the updated add_like function that handles toggle functionality
      const { data, error } = await supabaseAdmin.rpc('add_like', {
        p_user_id: userId,
        p_entry_id: entryId
      });
      
      if (error) {
        logger.error('Error toggling like with RPC', { detail: error?.message || String(error) });
        
        // Try with direct SQL as a fallback
        // First check if the like already exists
        const { data: existingLike, error: checkError } = await supabaseAdmin
          .from('likes')
          .select('id')
          .eq('user_id', userId)
          .eq('entry_id', entryId)
          .maybeSingle();
        
        if (checkError) {
          logger.error('Error checking existing like', { detail: checkError?.message || String(checkError) });
          return NextResponse.json(
            { error: 'Failed to check existing like' },
            { status: 500 }
          );
        }
        
        if (existingLike) {
          // Like exists, so remove it (toggle off)
          const { error: deleteError } = await supabaseAdmin
            .from('likes')
            .delete()
            .eq('user_id', userId)
            .eq('entry_id', entryId);

          if (deleteError) {
            logger.error('Error removing like', { detail: deleteError?.message || String(deleteError) });
            return NextResponse.json(
              { error: 'Failed to remove like' },
              { status: 500 }
            );
          }

          // Update cache
          await decrementCachedLikesCount(entryId);

          return NextResponse.json({
            success: true,
            action: 'unliked',
            liked: false
          });
        } else {
          // Like doesn't exist, so add it (toggle on)
          const { error: insertError } = await supabaseAdmin
            .from('likes')
            .insert({
              user_id: userId,
              entry_id: entryId
            });
          
          if (insertError) {
            logger.error('Error adding like', { detail: insertError?.message || String(insertError) });
            return NextResponse.json(
              { error: 'Failed to add like' },
              { status: 500 }
            );
          }

          // Update cache
          await incrementCachedLikesCount(entryId);

          // Send like notification asynchronously
          sendLikeNotification(entryId, userId).catch(err => {
            logger.error('Failed to send like notification', { detail: err instanceof Error ? err.message : String(err) });
          });

          return NextResponse.json({
            success: true,
            action: 'liked',
            liked: true
          });
        }
      }

      // Invalidate cache after RPC toggle
      await invalidateLikesCount(entryId);

      // Send like notification if the action was 'liked'
      if (data && data.liked === true) {
        sendLikeNotification(entryId, userId).catch(err => {
          logger.error('Failed to send like notification', { detail: err instanceof Error ? err.message : String(err) });
        });
      }

      // Return the result from the RPC function
      return NextResponse.json(data);
    } catch (error) {
      logger.error('Unexpected error toggling like', { detail: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: 'Failed to toggle like' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Unexpected error in likes API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 