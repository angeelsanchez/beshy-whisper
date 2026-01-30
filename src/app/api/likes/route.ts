import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../auth/[...nextauth]/auth';
import webpush from 'web-push';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:your@email.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Helper function to send like notification
async function sendLikeNotification(entryId: string, likerUserId: string) {
  try {
    // Get entry data to find the owner
    const { data: entryData, error: entryError } = await supabaseAdmin
      .from('entries')
      .select('user_id, mensaje')
      .eq('id', entryId)
      .single();
    
    if (entryError || !entryData) {
      console.error('Error fetching entry for notification:', entryError);
      return;
    }
    
    // Don't send notification if user likes their own post
    if (entryData.user_id === likerUserId) {
      return;
    }
    
    // Get liker user data
    const { data: likerData, error: likerError } = await supabaseAdmin
      .from('users')
      .select('bsy_id, name')
      .eq('id', likerUserId)
      .single();
    
    if (likerError || !likerData) {
      console.error('Error fetching liker data for notification:', likerError);
      return;
    }
    
    const likerName = likerData.name || likerData.bsy_id || 'Alguien';
    
    // Get entry owner's push token
    const { data: pushTokenData, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('endpoint, p256dh, auth')
      .eq('user_id', entryData.user_id)
      .maybeSingle();
    
    if (tokenError || !pushTokenData) {
      console.log('Entry owner has no push token registered:', entryData.user_id);
      return;
    }
    
    // Check if VAPID keys are configured
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error('VAPID keys not configured');
      return;
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
    
    // Send the push notification
    await webpush.sendNotification(pushSubscription, payload, {
      TTL: 60 * 60, // 1 hour
      headers: {
        'Urgency': 'normal'
      }
    });
    
    console.log('Like notification sent successfully:', {
      userId: entryData.user_id,
      likerName,
      entryId
    });
  } catch (error) {
    console.error('Error sending like notification:', error);
  }
}

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No session or user' },
        { status: 401 }
      );
    }
    
    // Get the request body
    const body = await request.json();
    const { entryId } = body;
    
    if (!entryId) {
      return NextResponse.json(
        { error: 'Invalid request. Required field: entryId' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    
    // Validate user ID
    if (!userId) {
      console.error('User ID missing in session:', session);
      return NextResponse.json(
        { error: 'Unauthorized - User ID missing in session' },
        { status: 401 }
      );
    }
    
    // Validate UUIDs
    if (!isValidUUID(userId)) {
      console.error('Invalid user ID:', userId);
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    if (!isValidUUID(entryId)) {
      console.error('Invalid entry ID:', entryId);
      return NextResponse.json(
        { error: 'Invalid entry ID' },
        { status: 400 }
      );
    }
    
    console.log('Processing like toggle action:', { userId, entryId });
    
    try {
      // Use the updated add_like function that handles toggle functionality
      const { data, error } = await supabaseAdmin.rpc('add_like', {
        p_user_id: userId,
        p_entry_id: entryId
      });
      
      if (error) {
        console.error('Error toggling like with RPC:', error);
        
        // Try with direct SQL as a fallback
        // First check if the like already exists
        const { data: existingLike, error: checkError } = await supabaseAdmin
          .from('likes')
          .select('id')
          .eq('user_id', userId)
          .eq('entry_id', entryId)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking existing like:', checkError);
          return NextResponse.json(
            { error: 'Failed to check existing like' },
            { status: 500 }
          );
        }
        
        if (existingLike) {
          // Like exists, so remove it (toggle off)
          const { error: deleteError } = await supabaseAdmin
            .from('likes')
            .delete()
            .eq('user_id', userId)
            .eq('entry_id', entryId);
          
          if (deleteError) {
            console.error('Error removing like:', deleteError);
            return NextResponse.json(
              { error: 'Failed to remove like' },
              { status: 500 }
            );
          }
          
          return NextResponse.json({ 
            success: true, 
            action: 'unliked',
            liked: false
          });
        } else {
          // Like doesn't exist, so add it (toggle on)
          const { error: insertError } = await supabaseAdmin
            .from('likes')
            .insert({
              user_id: userId,
              entry_id: entryId
            });
          
          if (insertError) {
            console.error('Error adding like:', insertError);
            return NextResponse.json(
              { error: 'Failed to add like' },
              { status: 500 }
            );
          }
          
          // Send like notification asynchronously
          sendLikeNotification(entryId, userId).catch(error => {
            console.error('Failed to send like notification:', error);
          });
          
          return NextResponse.json({ 
            success: true, 
            action: 'liked',
            liked: true
          });
        }
      }
      
      // Send like notification if the action was 'liked'
      if (data && data.liked === true) {
        sendLikeNotification(entryId, userId).catch(error => {
          console.error('Failed to send like notification:', error);
        });
      }
      
      // Return the result from the RPC function
      return NextResponse.json(data);
    } catch (error) {
      console.error('Unexpected error toggling like:', error);
      return NextResponse.json(
        { error: 'Failed to toggle like' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in likes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 