import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { updateNameSchema } from '@/lib/schemas/user';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const parsed = updateNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      );
    }
    const { name } = parsed.data;
    
    // Check if user can update their name (using the database function with admin client)
    const { data: canUpdateData, error: canUpdateError } = await supabaseAdmin
      .rpc('can_update_name', { user_id: userId });
    
    if (canUpdateError) {
      logger.error('Error checking if user can update name', { detail: canUpdateError?.message || String(canUpdateError) });
      return NextResponse.json(
        { message: 'Error checking name update eligibility' },
        { status: 500 }
      );
    }
    
    if (!canUpdateData) {
      return NextResponse.json(
        { message: 'You can only update your name once every 14 days' },
        { status: 403 }
      );
    }
    
    // Update the user's name using admin client (bypasses RLS for this specific case)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        name: name,
        last_name_update: new Date().toISOString(),
        needs_name_input: false
      })
      .eq('id', userId);
    
    if (updateError) {
      logger.error('Error updating user name', { detail: updateError?.message || String(updateError) });
      return NextResponse.json(
        { message: 'Failed to update name' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Name updated successfully',
      name: name
    });
  } catch (error) {
    logger.error('Name update error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 