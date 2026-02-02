import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import { safeCompare } from '@/utils/crypto-helpers';
import { logger } from '@/lib/logger';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:your@email.com',
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

async function hasReminderBeenSentToday(userId: string, reminderType: string): Promise<boolean> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'reminder')
    .gte('sent_at', startOfDay.toISOString())
    .contains('data', { reminder_type: reminderType })
    .limit(1);

  if (error) {
    logger.error('Error checking sent reminders', { userId, reminderType, detail: error.message });
    return true;
  }

  return Array.isArray(data) && data.length > 0;
}

async function logSentReminder(
  userId: string,
  title: string,
  body: string,
  reminderData: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'reminder',
      title,
      body,
      data: reminderData,
      sent_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Error logging sent reminder', { userId, detail: error.message });
  }
}

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

interface UserPostStatus {
  hasDayPost: boolean;
  hasNightPost: boolean;
}

interface ReminderResult {
  sent: boolean;
  type: 'notification' | 'streak_warning';
}

function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isInTimeWindow(currentTime: number, start: number, end: number): boolean {
  return currentTime >= start && currentTime < end;
}

async function sendAndLogReminder(
  userId: string,
  title: string,
  body: string,
  reminderData: Record<string, unknown>
): Promise<boolean> {
  const alreadySent = await hasReminderBeenSentToday(userId, reminderData.reminder_type as string);
  if (alreadySent) return false;

  const sent = await sendPushNotification(userId, title, body, reminderData);
  if (sent) {
    await logSentReminder(userId, title, body, reminderData);
  }
  return sent;
}

async function processMorningReminder(userId: string, currentTime: number, posts: UserPostStatus): Promise<ReminderResult> {
  if (!isInTimeWindow(currentTime, 600, 630) || posts.hasDayPost) {
    return { sent: false, type: 'notification' };
  }

  const sent = await sendAndLogReminder(
    userId,
    '🌅 ¡Hora de tu Whisper matutino!',
    'No olvides compartir tu whisper del día para mantener tu racha',
    { reminder_type: 'morning', time: '10:00' }
  );
  return { sent, type: 'notification' };
}

async function processStreakWarning(userId: string, currentTime: number, posts: UserPostStatus): Promise<ReminderResult> {
  if (!isInTimeWindow(currentTime, 900, 1081) || (posts.hasDayPost && posts.hasNightPost)) {
    return { sent: false, type: 'streak_warning' };
  }

  const alreadySent = await hasReminderBeenSentToday(userId, 'streak_warning');
  if (alreadySent) return { sent: false, type: 'streak_warning' };

  const streak = await calculateUserStreak(userId);
  if (streak <= 0) return { sent: false, type: 'streak_warning' };

  const sent = await sendAndLogReminder(
    userId,
    '⚠️ ¡Cuidado con tu racha!',
    `Tienes una racha de ${streak} días. ¡Postea ahora para no perderla!`,
    { reminder_type: 'streak_warning', current_streak: streak }
  );
  return { sent, type: 'streak_warning' };
}

async function processNightReminder(userId: string, currentTime: number, posts: UserPostStatus): Promise<ReminderResult> {
  if (!isInTimeWindow(currentTime, 1290, 1320) || posts.hasNightPost) {
    return { sent: false, type: 'notification' };
  }

  const sent = await sendAndLogReminder(
    userId,
    '🌙 ¡Hora de tu Whisper nocturno!',
    'Completa tu día con tu whisper de la noche',
    { reminder_type: 'night', time: '21:30' }
  );
  return { sent, type: 'notification' };
}

async function processUserReminders(userId: string): Promise<{ notifications: number; streakWarnings: number }> {
  const posts = await checkUserTodayPosts(userId);
  const currentTime = getCurrentTimeInMinutes();

  const results = await Promise.all([
    processMorningReminder(userId, currentTime, posts),
    processStreakWarning(userId, currentTime, posts),
    processNightReminder(userId, currentTime, posts),
  ]);

  let notifications = 0;
  let streakWarnings = 0;
  for (const result of results) {
    if (!result.sent) continue;
    if (result.type === 'streak_warning') streakWarnings++;
    else notifications++;
  }
  return { notifications, streakWarnings };
}

async function processReminders(): Promise<{ notificationsSent: number; streakWarningsSent: number }> {
  try {
    logger.info('Starting reminder processing');

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
        const { notifications, streakWarnings } = await processUserReminders(user.user_id);
        notificationsSent += notifications;
        streakWarningsSent += streakWarnings;
      } catch (error) {
        logger.error('Error processing reminders for user', {
          userId: user.user_id,
          detail: error instanceof Error ? error.message : String(error),
        });
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
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, secret } = body;

    if (!secret || !safeCompare(secret, cronSecret)) {
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