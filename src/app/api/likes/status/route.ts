import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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
    const entryId = searchParams.get('entryId');
    
    if (!entryId) {
      return NextResponse.json(
        { error: 'Invalid request. Required parameter: entryId' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    
    // Validate user ID
    if (!userId) {
      console.error('User ID missing in session:', session);
      return NextResponse.json(
        { error: 'Unauthorized - User ID missing in session' },
        { status: 401 }
      );
    }
    
    // Validate UUIDs
    if (!isValidUUID(userId)) {
      console.error('Invalid user ID:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    if (!isValidUUID(entryId)) {
      console.error('Invalid entry ID:', entryId);
      return NextResponse.json(
        { error: 'Invalid entry ID' },
        { status: 400 }
      );
    }
    
    try {
      // Use the check_like_status function to check if the user has liked the entry
      const { data, error } = await supabaseAdmin.rpc('check_like_status', {
        p_user_id: userId,
        p_entry_id: entryId
      });
      
      if (error) {
        console.error('Error checking like status with RPC:', error);
        
        // Try with direct SQL as a fallback
        const { data: existingLike, error: checkError } = await supabaseAdmin
          .from('likes')
          .select('id')
          .eq('user_id', userId)
          .eq('entry_id', entryId)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking existing like:', checkError);
          return NextResponse.json(
            { error: 'Failed to check like status' },
            { status: 500 }
          );
        }
        
        // Get the total likes count for the entry
        const { data: likesCount, error: countError } = await supabaseAdmin.rpc('get_likes_count', {
          p_entry_id: entryId
        });
        
        let count = 0;
        if (countError) {
          console.error('Error getting likes count with RPC:', countError);
          
          // Try with direct SQL as a fallback
          const { data: countData, error: directCountError } = await supabaseAdmin
            .from('likes')
            .select('id', { count: 'exact' })
            .eq('entry_id', entryId);
          
          if (!directCountError) {
            count = countData?.length || 0;
          }
        } else {
          count = likesCount || 0;
        }
        
        return NextResponse.json({
          liked: !!existingLike,
          count: count
        });
      }
      
      // Get the total likes count for the entry
      const { data: likesCount, error: countError } = await supabaseAdmin.rpc('get_likes_count', {
        p_entry_id: entryId
      });
      
      let count = 0;
      if (countError) {
        console.error('Error getting likes count with RPC:', countError);
        
        // Try with direct SQL as a fallback
        const { data: countData, error: directCountError } = await supabaseAdmin
          .from('likes')
          .select('id', { count: 'exact' })
          .eq('entry_id', entryId);
        
        if (!directCountError) {
          count = countData?.length || 0;
        }
      } else {
        count = likesCount || 0;
      }
      
      // Return the result
      return NextResponse.json({
        liked: !!data,
        count: count
      });
    } catch (error) {
      console.error('Unexpected error checking like status:', error);
      return NextResponse.json(
        { error: 'Failed to check like status' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in likes status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 