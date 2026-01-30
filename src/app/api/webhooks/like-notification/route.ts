import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeCompare } from '@/utils/crypto-helpers';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:hola@beshy.es',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (basic security)
    const webhookSecret = request.headers.get('webhook-secret');
    if (!webhookSecret || !safeCompare(webhookSecret, process.env.WEBHOOK_SECRET || '')) {
      console.error('Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('Received like notification webhook:', body);
    
    // Extract data from the webhook payload
    const { record } = body;
    if (!record || record.type !== 'like') {
      return NextResponse.json(
        { message: 'Notification type not supported or missing' },
        { status: 200 }
      );
    }
    
    const { user_id: userId, title, body: notificationBody, data } = record;
    
    if (!userId || !title || !notificationBody) {
      console.error('Missing required notification data:', { userId, title, notificationBody });
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
      console.log('User has no push token registered:', userId);
      return NextResponse.json(
        { message: 'User has no push token registered' },
        { status: 200 }
      );
    }
    
    // Check if VAPID keys are configured
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error('VAPID keys not configured');
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
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
      tag: 'like-notification',
      requireInteraction: false,
      data: {
        url: data?.entry_id ? `/feed?highlight=${data.entry_id}` : '/feed',
        type: 'like',
        ...data
      }
    });
    
    try {
      // Send the push notification
      const result = await webpush.sendNotification(pushSubscription, payload);
      
      console.log('Push notification sent successfully:', {
        userId,
        title,
        body: notificationBody,
        statusCode: result.statusCode
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Push notification sent successfully'
      });
    } catch (pushError: any) {
      console.error('Error sending push notification:', pushError);
      
      // If the push token is invalid, remove it from the database
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('user_id', userId);
        
        console.log('Removed invalid push token for user:', userId);
        
        return NextResponse.json(
          { message: 'Invalid push token removed' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to send push notification', details: pushError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in like notification webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}