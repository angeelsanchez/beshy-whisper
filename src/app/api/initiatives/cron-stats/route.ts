import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { safeCompare } from '@/utils/crypto-helpers';
import { sendPushToUser } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function getWeekStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const COMMUNITY_STREAK_THRESHOLD = 0.8;

interface ActiveInitiative {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly participant_count: number;
  readonly community_streak: number;
  readonly start_date: string;
  readonly end_date: string | null;
  readonly reminder_time: string | null;
}

async function computeDailyStats(
  initiatives: ReadonlyArray<ActiveInitiative>,
  date: string
): Promise<{ computed: number; errors: number }> {
  let computed = 0;
  let errors = 0;

  for (const initiative of initiatives) {
    if (date < initiative.start_date) continue;
    if (initiative.end_date && date > initiative.end_date) continue;

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('initiative_logs')
      .select('user_id')
      .eq('initiative_id', initiative.id)
      .eq('completed_at', date);

    if (logsError) {
      logger.error('Error fetching logs for daily stats', { initiativeId: initiative.id, date, detail: logsError.message });
      errors++;
      continue;
    }

    const uniqueUsers = new Set((logs ?? []).map(l => l.user_id));
    const completedCount = uniqueUsers.size;
    const totalParticipants = Math.max(initiative.participant_count, 1);
    const completionRate = Math.round((completedCount / totalParticipants) * 10000) / 100;

    const { error: upsertError } = await supabaseAdmin
      .from('initiative_daily_stats')
      .upsert(
        {
          initiative_id: initiative.id,
          date,
          total_participants: initiative.participant_count,
          completed_count: completedCount,
          completion_rate: completionRate,
        },
        { onConflict: 'initiative_id,date' }
      );

    if (upsertError) {
      logger.error('Error upserting daily stats', { initiativeId: initiative.id, date, detail: upsertError.message });
      errors++;
    } else {
      computed++;
    }
  }

  return { computed, errors };
}

async function updateCommunityStreaks(
  initiatives: ReadonlyArray<ActiveInitiative>,
  yesterday: string
): Promise<{ updated: number; reset: number }> {
  let updated = 0;
  let reset = 0;

  for (const initiative of initiatives) {
    if (yesterday < initiative.start_date) continue;

    const { data: stat } = await supabaseAdmin
      .from('initiative_daily_stats')
      .select('completion_rate')
      .eq('initiative_id', initiative.id)
      .eq('date', yesterday)
      .maybeSingle();

    const rate = stat?.completion_rate ?? 0;
    const meetsThreshold = rate >= COMMUNITY_STREAK_THRESHOLD * 100;

    if (meetsThreshold) {
      const newStreak = initiative.community_streak + 1;
      await supabaseAdmin
        .from('initiatives')
        .update({ community_streak: newStreak })
        .eq('id', initiative.id);
      updated++;

      const milestones = [7, 14, 21, 30, 50, 100];
      if (milestones.includes(newStreak) && initiative.participant_count <= 50) {
        const { data: participants } = await supabaseAdmin
          .from('initiative_participants')
          .select('user_id')
          .eq('initiative_id', initiative.id)
          .eq('is_active', true);

        for (const p of participants ?? []) {
          sendPushToUser(p.user_id, {
            title: `🔥 Racha de ${newStreak} días`,
            body: `El equipo en "${initiative.name}" lleva ${newStreak} días seguidos`,
            tag: `init-streak-${initiative.id}`,
            data: { url: `/initiatives/${initiative.id}`, type: 'initiative_streak' },
          }).catch(() => {});
        }
      }
    } else if (initiative.community_streak > 0) {
      await supabaseAdmin
        .from('initiatives')
        .update({ community_streak: 0 })
        .eq('id', initiative.id);
      reset++;
    }
  }

  return { updated, reset };
}

async function sendWeeklySummaries(
  initiatives: ReadonlyArray<ActiveInitiative>
): Promise<number> {
  if (!isSunday()) return 0;

  const weekStart = getWeekStartDate();
  const today = getTodayDate();
  let sent = 0;

  for (const initiative of initiatives) {
    if (initiative.participant_count === 0) continue;

    const { data: weekStats } = await supabaseAdmin
      .from('initiative_daily_stats')
      .select('completion_rate')
      .eq('initiative_id', initiative.id)
      .gte('date', weekStart)
      .lte('date', today);

    if (!weekStats || weekStats.length === 0) continue;

    const avgRate = Math.round(
      weekStats.reduce((sum, s) => sum + Number(s.completion_rate), 0) / weekStats.length
    );

    const { data: participants } = await supabaseAdmin
      .from('initiative_participants')
      .select('user_id')
      .eq('initiative_id', initiative.id)
      .eq('is_active', true);

    if (!participants || participants.length === 0) continue;

    const icon = initiative.icon ?? '📊';
    for (const p of participants) {
      sendPushToUser(p.user_id, {
        title: `${icon} Resumen semanal de ${initiative.name}`,
        body: `Esta semana: ${avgRate}% completado en promedio`,
        tag: `init-weekly-${initiative.id}`,
        data: { url: `/initiatives/${initiative.id}`, type: 'initiative_weekly' },
      }).catch(() => {});
    }
    sent++;
  }

  return sent;
}

async function processInitiativeReminders(
  initiatives: ReadonlyArray<ActiveInitiative>
): Promise<number> {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = getTodayDate();
  let sent = 0;

  for (const initiative of initiatives) {
    if (!initiative.reminder_time) continue;
    if (today < initiative.start_date) continue;
    if (initiative.end_date && today > initiative.end_date) continue;

    const parts = initiative.reminder_time.split(':').map(Number);
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) continue;
    const reminderMinutes = parts[0] * 60 + parts[1];

    if (Math.abs(currentMinutes - reminderMinutes) > 15) continue;

    const { data: participants } = await supabaseAdmin
      .from('initiative_participants')
      .select('user_id')
      .eq('initiative_id', initiative.id)
      .eq('is_active', true);

    if (!participants || participants.length === 0) continue;

    const userIds = participants.map(p => p.user_id);

    const { data: todayLogs } = await supabaseAdmin
      .from('initiative_logs')
      .select('user_id')
      .eq('initiative_id', initiative.id)
      .eq('completed_at', today)
      .in('user_id', userIds);

    const completedSet = new Set((todayLogs ?? []).map(l => l.user_id));
    const icon = initiative.icon ?? '🎯';

    for (const userId of userIds) {
      if (completedSet.has(userId)) continue;

      sendPushToUser(userId, {
        title: `${icon} ${initiative.name}`,
        body: 'No olvides tu check-in de hoy',
        tag: `init-reminder-${initiative.id}`,
        data: { url: `/initiatives/${initiative.id}`, type: 'initiative_reminder' },
      }).catch(() => {});
      sent++;
    }
  }

  return sent;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    logger.info('Initiative cron-stats triggered');

    const { data: initiatives, error: fetchError } = await supabaseAdmin
      .from('initiatives')
      .select('id, name, icon, participant_count, community_streak, start_date, end_date, reminder_time')
      .eq('is_active', true);

    if (fetchError) {
      logger.error('Error fetching active initiatives', { detail: fetchError.message });
      return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 });
    }

    if (!initiatives || initiatives.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active initiatives',
        timestamp: new Date().toISOString(),
      });
    }

    const yesterday = getYesterdayDate();
    const today = getTodayDate();

    const [dailyResult, streakResult, weeklySent, remindersSent] = await Promise.all([
      computeDailyStats(initiatives, yesterday),
      updateCommunityStreaks(initiatives, yesterday),
      sendWeeklySummaries(initiatives),
      processInitiativeReminders(initiatives),
    ]);

    const todayStatsResult = await computeDailyStats(initiatives, today);

    logger.info('Initiative cron-stats complete', {
      initiatives: initiatives.length,
      yesterdayStats: dailyResult,
      todayStats: todayStatsResult,
      streaks: streakResult,
      weeklySummaries: weeklySent,
      remindersSent,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        active_initiatives: initiatives.length,
        yesterday_stats: dailyResult,
        today_stats: todayStatsResult,
        streaks: streakResult,
        weekly_summaries_sent: weeklySent,
        reminders_sent: remindersSent,
      },
    });
  } catch (error) {
    logger.error('Error in initiative cron-stats', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
