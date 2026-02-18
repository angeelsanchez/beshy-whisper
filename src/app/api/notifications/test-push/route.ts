import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import { ensureVapidConfigured } from '@/lib/push-notify';
import { logger } from '@/lib/logger';
import { testPushSchema } from '@/lib/schemas/notifications';

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
    const parsed = testPushSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, body: messageBody, icon, tag, data } = parsed.data;

    const { data: pushTokens, error: tokensError } = await supabaseAdmin
      .from('push_tokens')
      .select('*')
      .eq('user_id', session.user.id);

    if (tokensError) {
      logger.error('Error fetching push tokens', { detail: tokensError?.message || String(tokensError) });
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

    if (!ensureVapidConfigured()) {
      return NextResponse.json(
        { error: 'VAPID configuration missing' },
        { status: 500 }
      );
    }

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

        logger.info('Test notification sent successfully', { tokenId: token.id });
      } catch (error) {
        logger.error('Error sending test notification', { tokenId: token.id, detail: error instanceof Error ? error.message : String(error) });

        results.push({
          tokenId: token.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (error instanceof Error && error.message.includes('410')) {
          try {
            await supabaseAdmin
              .from('push_tokens')
              .delete()
              .eq('id', token.id);
            logger.info('Removed invalid token', { tokenId: token.id });
          } catch (deleteError) {
            logger.error('Error removing invalid token', { tokenId: token.id, detail: deleteError instanceof Error ? deleteError.message : String(deleteError) });
          }
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    logger.info('Test notification results', { successCount, errorCount });

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
    logger.error('Error in test-push endpoint', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
