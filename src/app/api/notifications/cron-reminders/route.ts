import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeCompare } from '@/utils/crypto-helpers';
import { logger } from '@/lib/logger';
import { sendPushToUser } from '@/lib/push-notify';
import { isNotificationEnabled, getBatchUserPreferences } from '@/lib/notification-preferences';
import { calculateUserStreak, checkUserTodayPosts } from '@/lib/streak';
import {
  MORNING_REMINDER_START, MORNING_REMINDER_END,
  STREAK_WARNING_START, STREAK_WARNING_END,
  NIGHT_REMINDER_START, NIGHT_REMINDER_END,
} from '@/lib/constants';
import type { NotificationType } from '@/types/notification-preferences';
import { cronReminderSchema } from '@/lib/schemas/notifications';

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
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'reminder',
      title,
      body,
      data: reminderData,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    logger.error('Error logging sent reminder', { userId, detail: error.message });
    return null;
  }

  return data?.id ?? null;
}

async function deleteReminderLog(logId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', logId);

  if (error) {
    logger.error('Error deleting failed reminder log', { logId, detail: error.message });
  }
}

type PreferencesRecord = Record<string, boolean> | null;

async function sendReminderPush(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<boolean> {
  return sendPushToUser(userId, {
    title,
    body,
    tag: 'reminder-notification',
    requireInteraction: true,
    data: { url: '/create', type: 'reminder', ...data },
  });
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
  reminderData: Record<string, unknown>,
  notificationType: NotificationType,
  userPrefs: PreferencesRecord
): Promise<boolean> {
  if (!isNotificationEnabled(userPrefs, notificationType)) return false;

  const alreadySent = await hasReminderBeenSentToday(userId, reminderData.reminder_type as string);
  if (alreadySent) return false;

  // Log BEFORE sending to prevent race conditions with concurrent cron calls.
  // If two requests pass the check simultaneously, the first to log claims the slot.
  const logId = await logSentReminder(userId, title, body, reminderData);

  const sent = await sendReminderPush(userId, title, body, reminderData);
  if (!sent && logId) {
    // Push failed: delete the log so the next cron run retries
    await deleteReminderLog(logId);
    logger.warn('Push send failed, reminder log deleted for retry', { userId, reminderType: reminderData.reminder_type });
  }
  return sent;
}

async function processMorningReminder(userId: string, currentTime: number, posts: UserPostStatus, prefs: PreferencesRecord): Promise<ReminderResult> {
  if (!isInTimeWindow(currentTime, MORNING_REMINDER_START, MORNING_REMINDER_END) || posts.hasDayPost) {
    return { sent: false, type: 'notification' };
  }

  const sent = await sendAndLogReminder(
    userId,
    '🌅 ¡Hora de tu Whisper matutino!',
    'No olvides compartir tu whisper del día para mantener tu racha',
    { reminder_type: 'morning', time: '10:00' },
    'reminder_morning',
    prefs
  );
  return { sent, type: 'notification' };
}

async function processStreakWarning(userId: string, currentTime: number, posts: UserPostStatus, prefs: PreferencesRecord): Promise<ReminderResult> {
  if (!isInTimeWindow(currentTime, STREAK_WARNING_START, STREAK_WARNING_END) || (posts.hasDayPost && posts.hasNightPost)) {
    return { sent: false, type: 'streak_warning' };
  }

  if (!isNotificationEnabled(prefs, 'reminder_streak')) return { sent: false, type: 'streak_warning' };

  const alreadySent = await hasReminderBeenSentToday(userId, 'streak_warning');
  if (alreadySent) return { sent: false, type: 'streak_warning' };

  const streak = await calculateUserStreak(userId);
  if (streak <= 0) return { sent: false, type: 'streak_warning' };

  const sent = await sendAndLogReminder(
    userId,
    '⚠️ ¡Cuidado con tu racha!',
    `Tienes una racha de ${streak} días. ¡Postea ahora para no perderla!`,
    { reminder_type: 'streak_warning', current_streak: streak },
    'reminder_streak',
    prefs
  );
  return { sent, type: 'streak_warning' };
}

async function processNightReminder(userId: string, currentTime: number, posts: UserPostStatus, prefs: PreferencesRecord): Promise<ReminderResult> {
  if (!isInTimeWindow(currentTime, NIGHT_REMINDER_START, NIGHT_REMINDER_END) || posts.hasNightPost) {
    return { sent: false, type: 'notification' };
  }

  const sent = await sendAndLogReminder(
    userId,
    '🌙 ¡Hora de tu Whisper nocturno!',
    'Completa tu día con tu whisper de la noche',
    { reminder_type: 'night', time: '21:30' },
    'reminder_night',
    prefs
  );
  return { sent, type: 'notification' };
}

async function processUserReminders(userId: string, prefs: PreferencesRecord): Promise<{ notifications: number; streakWarnings: number }> {
  const posts = await checkUserTodayPosts(userId);
  const currentTime = getCurrentTimeInMinutes();

  const results = await Promise.all([
    processMorningReminder(userId, currentTime, posts, prefs),
    processStreakWarning(userId, currentTime, posts, prefs),
    processNightReminder(userId, currentTime, posts, prefs),
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

function getTodayStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function isWithinReminderWindow(currentMinutes: number, reminderTime: string): boolean {
  const parts = reminderTime.split(':').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return false;
  const reminderMinutes = parts[0] * 60 + parts[1];
  return Math.abs(currentMinutes - reminderMinutes) <= 15;
}

async function processHabitReminders(): Promise<number> {
  const currentMinutes = getCurrentTimeInMinutes();
  const todayStr = getTodayStr();
  const currentDayOfWeek = new Date().getDay();

  const { data: habits, error } = await supabaseAdmin
    .from('habits')
    .select('id, user_id, name, icon, reminder_time, target_days')
    .eq('is_active', true)
    .not('reminder_time', 'is', null);

  if (error || !habits || habits.length === 0) return 0;

  const candidateHabits = habits.filter(h => {
    if (!isWithinReminderWindow(currentMinutes, h.reminder_time)) return false;
    const days = Array.isArray(h.target_days) ? h.target_days : [];
    return days.length === 0 || days.includes(currentDayOfWeek);
  });

  if (candidateHabits.length === 0) return 0;

  const habitIds = candidateHabits.map(h => h.id);
  const { data: todayLogs } = await supabaseAdmin
    .from('habit_logs')
    .select('habit_id')
    .in('habit_id', habitIds)
    .eq('completed_at', todayStr);

  const completedHabitIds = new Set((todayLogs ?? []).map(l => l.habit_id));

  const habitUserIds = [...new Set(candidateHabits.map(h => h.user_id))];
  const habitPrefsMap = await getBatchUserPreferences(habitUserIds);

  let sent = 0;
  for (const habit of candidateHabits) {
    if (completedHabitIds.has(habit.id)) continue;

    const userPrefs = habitPrefsMap.get(habit.user_id) ?? null;
    const reminderType = `habit_${habit.id}`;
    const icon = habit.icon ?? '🎯';
    const success = await sendAndLogReminder(
      habit.user_id,
      `${icon} ¡Hora de: ${habit.name}!`,
      `No olvides completar tu hábito "${habit.name}" hoy`,
      { reminder_type: reminderType, habit_id: habit.id, url: '/habits' },
      'reminder_habit',
      userPrefs
    );
    if (success) sent++;
  }

  return sent;
}

async function processReminders(): Promise<{ notificationsSent: number; streakWarningsSent: number; habitRemindersSent: number }> {
  try {
    logger.info('Starting reminder processing');

    const { data: users, error: usersError } = await supabaseAdmin
      .from('push_tokens')
      .select('user_id');

    if (usersError || !users) {
      logger.error('Error fetching users with push tokens', { detail: usersError?.message || String(usersError) });
      return { notificationsSent: 0, streakWarningsSent: 0, habitRemindersSent: 0 };
    }

    logger.info('Processing reminders for users', { count: users.length });

    const userIds = users.map(u => u.user_id);
    const prefsMap = await getBatchUserPreferences(userIds);

    let notificationsSent = 0;
    let streakWarningsSent = 0;

    for (const user of users) {
      try {
        const userPrefs = prefsMap.get(user.user_id) ?? null;
        const { notifications, streakWarnings } = await processUserReminders(user.user_id, userPrefs);
        notificationsSent += notifications;
        streakWarningsSent += streakWarnings;
      } catch (error) {
        logger.error('Error processing reminders for user', {
          userId: user.user_id,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const habitRemindersSent = await processHabitReminders();

    logger.info('Reminder processing complete', { notificationsSent, streakWarningsSent, habitRemindersSent });
    return { notificationsSent, streakWarningsSent, habitRemindersSent };
  } catch (error) {
    logger.error('Error in reminder processing', { detail: error instanceof Error ? error.message : String(error) });
    return { notificationsSent: 0, streakWarningsSent: 0, habitRemindersSent: 0 };
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
    const parsed = cronReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { secret } = parsed.data;

    if (!safeCompare(secret, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Manual trigger requested');
    const result = await processReminders();

    return NextResponse.json({
      success: true,
      message: 'Manual reminders processed successfully',
      timestamp: new Date().toISOString(),
      results: result
    });
    
  } catch (error) {
    logger.error('Error in cron reminders POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 