import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { likeStatusSchema } from '@/lib/schemas/likes';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';
import { getCachedLikesCount, setCachedLikesCount } from '@/lib/cache/counters';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No session or user' },
        { status: 401 }
      );
    }

    // Get the entry ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const parsed = likeStatusSchema.safeParse({ entryId: searchParams.get('entryId') });
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

    try {
      // Check if user has liked this entry
      const { data, error } = await supabaseAdmin.rpc('check_like_status', {
        p_user_id: userId,
        p_entry_id: entryId
      });

      let liked = false;
      if (error) {
        logger.error('Error checking like status with RPC', { detail: error?.message || String(error) });

        // Fallback to direct query
        const { data: existingLike, error: checkError } = await supabaseAdmin
          .from('likes')
          .select('id')
          .eq('user_id', userId)
          .eq('entry_id', entryId)
          .maybeSingle();

        if (checkError) {
          logger.error('Error checking existing like', { detail: checkError?.message || String(checkError) });
          return NextResponse.json(
            { error: 'Failed to check like status' },
            { status: 500 }
          );
        }

        liked = !!existingLike;
      } else {
        liked = !!data;
      }

      // Try to get cached count first
      let count = await getCachedLikesCount(entryId);

      if (count === null) {
        // Cache miss - fetch from database
        const { data: likesCount, error: countError } = await supabaseAdmin.rpc('get_likes_count', {
          p_entry_id: entryId
        });

        if (countError) {
          logger.error('Error getting likes count with RPC', { detail: countError?.message || String(countError) });

          // Fallback to direct count
          const { data: countData, error: directCountError } = await supabaseAdmin
            .from('likes')
            .select('id', { count: 'exact' })
            .eq('entry_id', entryId);

          if (!directCountError) {
            count = countData?.length || 0;
          } else {
            count = 0;
          }
        } else {
          count = likesCount || 0;
        }

        // Cache the count
        await setCachedLikesCount(entryId, count ?? 0);
      }

      return NextResponse.json({
        liked,
        count
      });
    } catch (error) {
      logger.error('Unexpected error checking like status', { detail: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Unexpected error in likes status API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
