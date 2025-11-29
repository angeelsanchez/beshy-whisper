import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[SESSION DEBUG] Starting session diagnostics...');
    
    const session = await getServerSession(authOptions);
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      session_exists: !!session,
      session_user_exists: !!session?.user,
      session_data: session ? {
        user_id: session.user?.id,
        user_email: session.user?.email,
        user_name: session.user?.name,
        user_alias: (session.user as any)?.alias,
        user_bsy_id: (session.user as any)?.bsy_id,
        expires: session.expires
      } : null,
      auth_options_configured: {
        providers_count: authOptions.providers?.length || 0,
        secret_configured: !!process.env.NEXTAUTH_SECRET,
        jwt_strategy: authOptions.session?.strategy === 'jwt'
      },
      environment: {
        node_env: process.env.NODE_ENV,
        nextauth_url: process.env.NEXTAUTH_URL,
        google_client_configured: !!process.env.GOOGLE_CLIENT_ID
      }
    };

    console.log('[SESSION DEBUG] Session diagnostics:', diagnostics);
    
    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error('[SESSION DEBUG] Error in session diagnostics:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}