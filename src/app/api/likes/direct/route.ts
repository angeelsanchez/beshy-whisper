import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { toggleLikeSchema } from '@/lib/schemas/likes';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';

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
    
    logger.info('Processing direct like toggle action', { userId, entryId });
    
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
        logger.error('Error removing like with admin client', { detail: deleteError?.message || String(deleteError) });
        return NextResponse.json(
          { error: 'Failed to remove like' },
          { status: 500 }
        );
      }
      
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
        logger.error('Error adding like with admin client', { detail: insertError?.message || String(insertError) });
        return NextResponse.json(
          { error: 'Failed to add like' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        action: 'liked',
        liked: true
      });
    }
  } catch (error) {
    logger.error('Unexpected error in direct likes API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 