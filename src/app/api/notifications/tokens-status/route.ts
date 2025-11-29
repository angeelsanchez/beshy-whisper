import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's push tokens with detailed information
    const { data: pushTokens, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('*')
      .eq('user_id', session.user.id);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch push tokens' },
        { status: 500 }
      );
    }

    if (!pushTokens || pushTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No push tokens found for user',
        tokens: [],
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          complete: 0,
          incomplete: 0
        }
      });
    }

    // Analyze token quality
    const tokenAnalysis = pushTokens.map(token => {
      const hasEndpoint = !!token.endpoint;
      const hasP256DH = !!token.p256dh;
      const hasAuth = !!token.auth;
      const hasUserId = !!token.user_id;
      
      const isComplete = hasEndpoint && hasP256DH && hasAuth && hasUserId;
      const isValid = hasEndpoint && hasP256DH && hasAuth;
      
      return {
        id: token.id,
        endpoint: hasEndpoint ? '✅' : '❌',
        p256dh: hasP256DH ? '✅' : '❌',
        auth: hasAuth ? '✅' : '❌',
        user_id: hasUserId ? '✅' : '❌',
        isComplete,
        isValid,
        created_at: token.created_at,
        last_used: token.last_used
      };
    });

    const total = pushTokens.length;
    const valid = tokenAnalysis.filter(t => t.isValid).length;
    const invalid = total - valid;
    const complete = tokenAnalysis.filter(t => t.isComplete).length;
    const incomplete = total - complete;

    return NextResponse.json({
      success: true,
      message: `Found ${total} push tokens for user`,
      tokens: tokenAnalysis,
      summary: {
        total,
        valid,
        invalid,
        complete,
        incomplete
      },
      quality: {
        validPercentage: Math.round((valid / total) * 100),
        completePercentage: Math.round((complete / total) * 100)
      }
    });

  } catch (error) {
    console.error('Error in tokens-status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 