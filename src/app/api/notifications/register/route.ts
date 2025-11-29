import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[REGISTER DEBUG] Starting push token registration...');
    
    const session = await getServerSession(authOptions);
    console.log('[REGISTER DEBUG] Session check:', session ? 'Found' : 'None');
    
    if (!session || !session.user) {
      console.log('[REGISTER DEBUG] No session or user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[REGISTER DEBUG] User authenticated:', session.user.id);
    
    const body = await request.json();
    const { endpoint, p256dh, auth } = body;
    console.log('[REGISTER DEBUG] Request data received:', {
      endpoint: endpoint ? endpoint.substring(0, 50) + '...' : 'None',
      p256dh_length: p256dh ? p256dh.length : 0,
      auth_length: auth ? auth.length : 0
    });
    
    if (!endpoint || !p256dh || !auth) {
      console.log('[REGISTER DEBUG] Missing required data:', { endpoint: !!endpoint, p256dh: !!p256dh, auth: !!auth });
      return NextResponse.json(
        { error: 'Missing required push subscription data' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    const userAgent = request.headers.get('user-agent') || '';
    
    console.log('[REGISTER DEBUG] Attempting database upsert...');
    console.log('[REGISTER DEBUG] User ID:', userId);
    console.log('[REGISTER DEBUG] User Agent:', userAgent.substring(0, 100));
    
    // First, try to verify user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.log('[REGISTER DEBUG] User verification failed:', userError);
      return NextResponse.json(
        { error: 'User not found', details: userError.message },
        { status: 404 }
      );
    }
    
    console.log('[REGISTER DEBUG] User verified:', userData.email);
    
    // Use admin client to bypass RLS for push token registration
    const { error } = await supabaseAdmin
      .from('push_tokens')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    console.log('[REGISTER DEBUG] Database operation result:', error ? 'ERROR' : 'SUCCESS');
    if (error) {
      console.log('[REGISTER DEBUG] Database error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    }
    
    if (error) {
      console.error('[REGISTER DEBUG] Error saving push token:', error);
      return NextResponse.json(
        { error: 'Failed to save push token', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('[REGISTER DEBUG] Push token registered successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[REGISTER DEBUG] Error in push token registration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}