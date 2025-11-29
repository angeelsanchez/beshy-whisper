import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:your@email.com',
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
      console.error('Error fetching entry:', entryError);
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
      console.error('Error fetching liker data:', likerError);
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
      console.error('Error fetching push token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch push token' },
        { status: 500 }
      );
    }
    
    if (!pushTokenData) {
      console.log('Entry owner has no push token registered:', entryData.user_id);
      return NextResponse.json(
        { message: 'Entry owner has no push token registered' },
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
      console.log('[PUSH DEBUG] Sending push notification...');
      console.log('[PUSH DEBUG] Subscription endpoint:', pushSubscription.endpoint.substring(0, 50) + '...');
      console.log('[PUSH DEBUG] Payload:', payload);
      
      // Send the push notification with proper options
      await webpush.sendNotification(pushSubscription, payload, {
        TTL: 60 * 60, // 1 hour
        headers: {
          'Urgency': 'normal'
        }
      });
      
      console.log('[PUSH DEBUG] Like notification sent successfully:', {
        userId: entryData.user_id,
        likerName,
        entryId
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Like notification sent successfully'
      });
    } catch (pushError: any) {
      console.error('[PUSH DEBUG] Error sending push notification:', pushError);
      
      // If the push token is invalid, remove it from the database
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('user_id', entryData.user_id);
        
        console.log('[PUSH DEBUG] Removed invalid push token for user:', entryData.user_id);
        
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
    console.error('Error in send-like notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}