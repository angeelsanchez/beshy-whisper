import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import { logger } from '@/lib/logger';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:hola@beshy.es',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, likerUserId } = body;
    
    if (!entryId || !likerUserId) {
      return NextResponse.json(
        { error: 'Missing required data: entryId and likerUserId' },
        { status: 400 }
      );
    }
    
    // Get entry data to find the owner
    const { data: entryData, error: entryError } = await supabaseAdmin
      .from('entries')
      .select('user_id, mensaje')
      .eq('id', entryId)
      .single();
    
    if (entryError || !entryData) {
      logger.error('Error fetching entry', { detail: entryError?.message || String(entryError) });
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }
    
    // Don't send notification if user likes their own post
    if (entryData.user_id === likerUserId) {
      return NextResponse.json({ 
        success: true,
        message: 'Self-like, no notification needed'
      });
    }
    
    // Get liker user data
    const { data: likerData, error: likerError } = await supabaseAdmin
      .from('users')
      .select('bsy_id, name')
      .eq('id', likerUserId)
      .single();
    
    if (likerError || !likerData) {
      logger.error('Error fetching liker data', { detail: likerError?.message || String(likerError) });
      return NextResponse.json(
        { error: 'Liker user not found' },
        { status: 404 }
      );
    }
    
    const likerName = likerData.name || likerData.bsy_id || 'Alguien';
    
    // Get entry owner's push token
    const { data: pushTokenData, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('endpoint, p256dh, auth')
      .eq('user_id', entryData.user_id)
      .maybeSingle();
    
    if (tokenError) {
      logger.error('Error fetching push token', { detail: tokenError?.message || String(tokenError) });
      return NextResponse.json(
        { error: 'Failed to fetch push token' },
        { status: 500 }
      );
    }
    
    if (!pushTokenData) {
      logger.info('Entry owner has no push token registered', { userId: entryData.user_id });
      return NextResponse.json(
        { message: 'Entry owner has no push token registered' },
        { status: 200 }
      );
    }
    
    // Check if VAPID keys are configured
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      logger.error('VAPID keys not configured');
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
    const notificationTitle = '❤️ Nuevo like en tu Whisper';
    const notificationBody = `${likerName} le dio like a tu whisper`;

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'like-notification',
      requireInteraction: false,
      data: {
        url: `/feed?highlight=${entryId}`,
        type: 'like',
        entry_id: entryId,
        liker_user_id: likerUserId,
        liker_name: likerName
      }
    });

    try {
      logger.debug('Sending push notification');
      
      // Send the push notification with proper options
      await webpush.sendNotification(pushSubscription, payload, {
        TTL: 60 * 60, // 1 hour
        headers: {
          'Urgency': 'normal'
        }
      });
      
      logger.info('Like notification sent successfully', {
        userId: entryData.user_id,
        likerName,
        entryId
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Like notification sent successfully'
      });
    } catch (pushError: unknown) {
      logger.error('Error sending push notification', { detail: pushError instanceof Error ? pushError.message : String(pushError) });

      const statusCode = pushError instanceof Error && 'statusCode' in pushError
        ? (pushError as { statusCode: number }).statusCode
        : undefined;
      const message = pushError instanceof Error ? pushError.message : 'Unknown error';

      // If the push token is invalid, remove it from the database
      if (statusCode === 410 || statusCode === 404) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('user_id', entryData.user_id);

        logger.info('Removed invalid push token for user', { userId: entryData.user_id });

        return NextResponse.json(
          { message: 'Invalid push token removed' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to send push notification', details: message },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in send-like notification', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}