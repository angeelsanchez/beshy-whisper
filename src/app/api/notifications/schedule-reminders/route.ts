import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import { logger } from '@/lib/logger';
import { safeCompare } from '@/utils/crypto-helpers';
import { ensureVapidConfigured } from '@/lib/push-notify';
import { calculateUserStreak, checkUserTodayPosts } from '@/lib/streak';
import {
  MORNING_REMINDER_START, MORNING_REMINDER_END,
  STREAK_WARNING_START, STREAK_WARNING_END,
  NIGHT_REMINDER_START, NIGHT_REMINDER_END,
} from '@/lib/constants';
import { scheduleReminderSchema } from '@/lib/schemas/notifications';

function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
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

    if (!ensureVapidConfigured()) {
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
      return;
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
        
        if (currentTime >= MORNING_REMINDER_START && currentTime < MORNING_REMINDER_END && !hasDayPost) {
          const title = '🌅 ¡Hora de tu Whisper matutino!';
          const body = 'No olvides compartir tu whisper del día para mantener tu racha';
          
          const sent = await sendPushNotification(userId, title, body, {
            reminder_type: 'morning',
            time: '10:00'
          });
          
          if (sent) notificationsSent++;
        }
        
        if (currentTime >= STREAK_WARNING_START && currentTime <= STREAK_WARNING_END && (!hasDayPost || !hasNightPost)) {
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
        
        if (currentTime >= NIGHT_REMINDER_START && currentTime < NIGHT_REMINDER_END && !hasNightPost) {
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
    
  } catch (error) {
    logger.error('Error in reminder processing', { detail: error instanceof Error ? error.message : String(error) });
  }
}

// API endpoint to manually trigger reminders (for testing)
export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = scheduleReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await processReminders();
    return NextResponse.json({
      success: true,
      message: 'Reminders processed successfully'
    });

  } catch (error) {
    logger.error('Error in reminder API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// GET endpoint to check reminder status
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const status = {
      currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
      nextReminders: {
        morning: currentTime < MORNING_REMINDER_START ? '10:00' : 'Tomorrow 10:00',
        afternoon: currentTime < STREAK_WARNING_START ? '15:00' : currentTime > STREAK_WARNING_END ? 'Tomorrow 15:00' : 'Active',
        night: currentTime < NIGHT_REMINDER_START ? '21:30' : 'Tomorrow 21:30'
      },
      systemStatus: 'Active'
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error('Error getting reminder status', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 