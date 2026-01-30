import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import { safeCompare } from '@/utils/crypto-helpers';
import { logger } from '@/lib/logger';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:hola@beshy.es',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// Helper function to calculate user's current streak
async function calculateUserStreak(userId: string): Promise<number> {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Get all entries for this user, ordered by date
    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('fecha, franja')
      .eq('user_id', userId)
      .order('fecha', { ascending: false });
    
    if (error || !entries || entries.length === 0) {
      return 0;
    }
    
    let streak = 0;
    const currentDate = new Date(startOfDay);
    
    // Check backwards from today
    while (true) {
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.fecha);
        const entryStartOfDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
        return entryStartOfDay.getTime() === currentDate.getTime();
      });
      
      // If no entries for this day, break the streak
      if (dayEntries.length === 0) {
        break;
      }
      
      // Check if both day and night posts exist for this date
      const hasDayPost = dayEntries.some(entry => entry.franja === 'DIA');
      const hasNightPost = dayEntries.some(entry => entry.franja === 'NOCHE');
      
      if (hasDayPost && hasNightPost) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  } catch (error) {
    logger.error('Error calculating user streak', { detail: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

// Helper function to check if user has posted today
async function checkUserTodayPosts(userId: string): Promise<{ hasDayPost: boolean; hasNightPost: boolean }> {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: entries, error } = await supabaseAdmin
      .from('entries')
      .select('franja')
      .eq('user_id', userId)
      .gte('fecha', startOfDay.toISOString())
      .lt('fecha', endOfDay.toISOString());

    if (error) {
      logger.error('Error checking today posts', { detail: error?.message || String(error) });
      return { hasDayPost: false, hasNightPost: false };
    }

    const hasDayPost = entries?.some(entry => entry.franja === 'DIA') || false;
    const hasNightPost = entries?.some(entry => entry.franja === 'NOCHE') || false;

    return { hasDayPost, hasNightPost };
  } catch (error) {
    logger.error('Error checking today posts', { detail: error instanceof Error ? error.message : String(error) });
    return { hasDayPost: false, hasNightPost: false };
  }
}

// Helper function to send push notification
async function sendPushNotification(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    // Get user's push token
    const { data: pushTokenData, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (tokenError || !pushTokenData) {
      logger.info('User has no push token registered', { userId });
      return false;
    }

    // Check if VAPID keys are configured
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      logger.error('VAPID keys not configured');
      return false;
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
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'reminder-notification',
      requireInteraction: true,
      data: {
        url: '/create',
        type: 'reminder',
        ...data
      }
    });
    
    // Send the push notification
    await webpush.sendNotification(pushSubscription, payload, {
      TTL: 60 * 60 * 2, // 2 hours
      headers: {
        'Urgency': 'high'
      }
    });
    
    logger.info('Reminder notification sent successfully', { userId, title });
    return true;
  } catch (error) {
    logger.error('Error sending reminder notification', { userId, detail: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

// Main function to process reminders for all users
async function processReminders() {
  try {
    logger.info('Starting reminder processing');
    
    // Get all users with push tokens
    const { data: users, error: usersError } = await supabaseAdmin
    .from('push_tokens')
    .select('user_id');
    
    if (usersError || !users) {
      logger.error('Error fetching users with push tokens', { detail: usersError?.message || String(usersError) });
      return { notificationsSent: 0, streakWarningsSent: 0 };
    }

    logger.info('Processing reminders for users', { count: users.length });
    
    let notificationsSent = 0;
    let streakWarningsSent = 0;
    
    for (const user of users) {
      try {
        const userId = user.user_id;
        
        // Check user's current posts for today
        const { hasDayPost, hasNightPost } = await checkUserTodayPosts(userId);
        
        // Get current time
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        // Morning reminder at 10:00 (600 minutes)
        if (currentTime >= 600 && currentTime < 630 && !hasDayPost) {
          const title = '🌅 ¡Hora de tu Whisper matutino!';
          const body = 'No olvides compartir tu whisper del día para mantener tu racha';
          
          const sent = await sendPushNotification(userId, title, body, {
            reminder_type: 'morning',
            time: '10:00'
          });
          
          if (sent) notificationsSent++;
        }
        
        // Afternoon streak warning between 15:00-18:00 (900-1080 minutes)
        if (currentTime >= 900 && currentTime <= 1080 && (!hasDayPost || !hasNightPost)) {
          const streak = await calculateUserStreak(userId);
          
          if (streak > 0) {
            const title = '⚠️ ¡Cuidado con tu racha!';
            const body = `Tienes una racha de ${streak} días. ¡Postea ahora para no perderla!`;
            
            const sent = await sendPushNotification(userId, title, body, {
              reminder_type: 'streak_warning',
              current_streak: streak
            });
            
            if (sent) streakWarningsSent++;
          }
        }
        
        // Night reminder at 21:30 (1290 minutes)
        if (currentTime >= 1290 && currentTime < 1320 && !hasNightPost) {
          const title = '🌙 ¡Hora de tu Whisper nocturno!';
          const body = 'Completa tu día con tu whisper de la noche';
          
          const sent = await sendPushNotification(userId, title, body, {
            reminder_type: 'night',
            time: '21:30'
          });
          
          if (sent) notificationsSent++;
        }
        
      } catch (error) {
        logger.error('Error processing reminders for user', { userId: user.user_id, detail: error instanceof Error ? error.message : String(error) });
      }
    }
    
    logger.info('Reminder processing complete', { notificationsSent, streakWarningsSent });
    
    return { notificationsSent, streakWarningsSent };
    
  } catch (error) {
    logger.error('Error in reminder processing', { detail: error instanceof Error ? error.message : String(error) });
    return { notificationsSent: 0, streakWarningsSent: 0 };
  }
}

// Cron endpoint - can be called by external cron services
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    logger.info('Cron job triggered');
    
    // Process reminders
    const result = await processReminders();
    
    return NextResponse.json({
      success: true,
      message: 'Cron reminders processed successfully',
      timestamp: new Date().toISOString(),
      results: result
    });
    
  } catch (error) {
    logger.error('Error in cron reminders', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST endpoint for manual triggering
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, secret } = body;
    
    // Verify secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && (!secret || !safeCompare(secret, cronSecret))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (action === 'process') {
      logger.info('Manual trigger requested');
      const result = await processReminders();
      
      return NextResponse.json({
        success: true,
        message: 'Manual reminders processed successfully',
        timestamp: new Date().toISOString(),
        results: result
      });
    }
    
    return NextResponse.json({ 
      error: 'Invalid action. Use "process" to trigger reminders.' 
    }, { status: 400 });
    
  } catch (error) {
    logger.error('Error in cron reminders POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 