import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { toggleLikeSchema } from '@/lib/schemas/likes';
import { uuidSchema } from '@/lib/schemas/common';

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
      console.error('User ID missing in session:', session);
      return NextResponse.json(
        { error: 'Unauthorized - User ID missing in session' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      console.error('Invalid user ID:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    console.log('Processing direct like toggle action:', { userId, entryId });
    
    // First check if the like already exists
    const { data: existingLike, error: checkError } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('entry_id', entryId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing like:', checkError);
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
        console.error('Error removing like with admin client:', deleteError);
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
        console.error('Error adding like with admin client:', insertError);
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
    console.error('Unexpected error in direct likes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 