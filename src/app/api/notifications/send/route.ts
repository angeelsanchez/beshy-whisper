import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import { safeCompare } from '@/utils/crypto-helpers';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:your@email.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal request (you might want to add authentication)
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
    
    // Get user's push token
    const { data: pushTokenData, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (tokenError) {
      console.error('Error fetching push token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch push token' },
        { status: 500 }
      );
    }
    
    if (!pushTokenData) {
      // User doesn't have push notifications enabled
      return NextResponse.json(
        { message: 'User has no push token registered' },
        { status: 200 }
      );
    }
    
    // Prepare the push subscription object
    const pushSubscription = {
      endpoint: pushTokenData.endpoint,
      keys: {
        p256dh: pushTokenData.p256dh,
        auth: pushTokenData.auth
      }
    };
    
    // Prepare the notification payload
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: data?.entry_id ? `/feed?highlight=${data.entry_id}` : '/feed',
        ...data
      }
    });
    
    try {
      // Send the push notification
      await webpush.sendNotification(pushSubscription, payload);
      
      console.log('Push notification sent successfully:', {
        userId,
        title,
        body: notificationBody
      });
      
      return NextResponse.json({ success: true });
    } catch (pushError: unknown) {
      console.error('Error sending push notification:', pushError);

      const statusCode = pushError instanceof Error && 'statusCode' in pushError
        ? (pushError as { statusCode: number }).statusCode
        : undefined;

      // If the push token is invalid, remove it from the database
      if (statusCode === 410 || statusCode === 404) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('user_id', userId);

        console.log('Removed invalid push token for user:', userId);
      }

      return NextResponse.json(
        { error: 'Failed to send push notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in push notification sending:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}