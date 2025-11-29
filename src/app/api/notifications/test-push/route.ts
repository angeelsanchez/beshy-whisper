import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, body: messageBody, icon, tag, data } = body;

    // Get user's push tokens
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
      return NextResponse.json(
        { error: 'No push tokens found for user' },
        { status: 404 }
      );
    }

    // Configure VAPID
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      console.error('VAPID keys not configured');
      return NextResponse.json(
        { error: 'VAPID configuration missing' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Send test notification to all user's tokens
    const results = [];
    for (const token of pushTokens) {
      try {
        const payload = JSON.stringify({
          title: title || '🧪 Test Notification',
          body: messageBody || 'Esta es una notificación de prueba',
          icon: icon || '/favicon.ico',
          tag: tag || 'test',
          data: data || {},
          timestamp: Date.now()
        });

        const result = await webpush.sendNotification(
          {
            endpoint: token.endpoint,
            keys: {
              p256dh: token.p256dh,
              auth: token.auth
            }
          },
          payload
        );

        results.push({
          tokenId: token.id,
          status: 'success',
          statusCode: result.statusCode
        });

        console.log(`Test notification sent successfully to token ${token.id}`);
      } catch (error) {
        console.error(`Error sending test notification to token ${token.id}:`, error);
        
        results.push({
          tokenId: token.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // If token is invalid, remove it
        if (error instanceof Error && error.message.includes('410')) {
          try {
            await supabaseAdmin
              .from('push_tokens')
              .delete()
              .eq('id', token.id);
            console.log(`Removed invalid token ${token.id}`);
          } catch (deleteError) {
            console.error(`Error removing invalid token ${token.id}:`, deleteError);
          }
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Test notification results: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${successCount} devices`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('Error in test-push endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 