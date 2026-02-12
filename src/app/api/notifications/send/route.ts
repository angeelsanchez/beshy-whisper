import { NextRequest, NextResponse } from 'next/server';
import { safeCompare } from '@/utils/crypto-helpers';
import { sendPushToUser } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !safeCompare(authHeader, `Bearer ${process.env.INTERNAL_API_KEY}`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, title, body: notificationBody, data } = body;

    if (!userId || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required notification data' },
        { status: 400 }
      );
    }

    const sent = await sendPushToUser(userId, {
      title,
      body: notificationBody,
      tag: 'direct-send',
      data: {
        url: data?.entry_id ? `/feed?highlight=${data.entry_id}` : '/feed',
        ...data
      }
    });

    if (sent) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { message: 'User has no push token registered or notification failed' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error in push notification sending', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
