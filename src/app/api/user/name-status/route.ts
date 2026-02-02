import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  try {
    // Get the session to verify authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get user's current name and last update time
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('name, last_name_update, needs_name_input')
      .eq('id', userId)
      .single();
    
    if (userError) {
      logger.error('Error fetching user data', { detail: userError?.message || String(userError) });
      return NextResponse.json(
        { message: 'Failed to fetch user data' },
        { status: 500 }
      );
    }
    
    // Check if user can update their name
    const { data: canUpdateData, error: canUpdateError } = await supabaseAdmin
      .rpc('can_update_name', { user_id: userId });
    
    if (canUpdateError) {
      logger.error('Error checking if user can update name', { detail: canUpdateError?.message || String(canUpdateError) });
      return NextResponse.json(
        { message: 'Error checking name update eligibility' },
        { status: 500 }
      );
    }
    
    // Calculate next available update date if applicable
    let nextUpdateDate = null;
    if (!canUpdateData && userData.last_name_update) {
      const lastUpdate = new Date(userData.last_name_update);
      nextUpdateDate = new Date(lastUpdate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days in milliseconds
    }
    
    return NextResponse.json({
      name: userData.name || null,
      canUpdate: canUpdateData,
      needsNameInput: userData.needs_name_input || false,
      nextUpdateDate: nextUpdateDate ? nextUpdateDate.toISOString() : null
    });
  } catch (error) {
    logger.error('Name status check error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 