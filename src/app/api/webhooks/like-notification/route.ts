import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/utils/crypto-helpers';
import { sendPushToUser } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = request.headers.get('webhook-secret');
    if (!webhookSecret || !safeCompare(webhookSecret, process.env.WEBHOOK_SECRET || '')) {
      logger.error('Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    logger.info('Received like notification webhook', { type: body?.type });

    const { record } = body;
    if (!record || record.type !== 'like') {
      return NextResponse.json(
        { message: 'Notification type not supported or missing' },
        { status: 200 }
      );
    }

    const { user_id: userId, title, body: notificationBody, data } = record;

    if (!userId || !title || !notificationBody) {
      logger.error('Missing required notification data', { userId, hasTitle: !!title, hasBody: !!notificationBody });
      return NextResponse.json(
        { error: 'Missing required notification data' },
        { status: 400 }
      );
    }

    const sent = await sendPushToUser(userId, {
      title,
      body: notificationBody,
      tag: 'like-notification',
      data: {
        url: data?.entry_id ? `/feed?highlight=${data.entry_id}` : '/feed',
        type: 'like',
        ...data
      }
    });

    return NextResponse.json({
      success: true,
      message: sent ? 'Push notification sent successfully' : 'No push token registered'
    });
  } catch (error) {
    logger.error('Error in like notification webhook', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
