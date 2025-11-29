import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
    const { name } = await req.json();
    
    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { message: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    
    if (name.length > 50) {
      return NextResponse.json(
        { message: 'Name cannot exceed 50 characters' },
        { status: 400 }
      );
    }
    
    // Check if user can update their name (using the database function with admin client)
    const { data: canUpdateData, error: canUpdateError } = await supabaseAdmin
      .rpc('can_update_name', { user_id: userId });
    
    if (canUpdateError) {
      console.error('Error checking if user can update name:', canUpdateError);
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
        name: name.trim(),
        last_name_update: new Date().toISOString(),
        needs_name_input: false
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating user name:', updateError);
      return NextResponse.json(
        { message: 'Failed to update name' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Name updated successfully',
      name: name.trim()
    });
  } catch (error) {
    console.error('Name update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 