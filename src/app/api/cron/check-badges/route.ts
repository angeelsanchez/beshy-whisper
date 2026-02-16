import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

const BUILDING_THRESHOLD_DAYS = 21;
const BUILDING_THRESHOLD_COMPLETION = 80;
const IDENTITY_THRESHOLD_DAYS = 90;
const IDENTITY_THRESHOLD_COMPLETION = 90;
const REVOKE_THRESHOLD_CONSECUTIVE_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: allHabits, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, user_id, created_at');

    if (habitsError || !allHabits) {
      logger.error('Error fetching habits for badge check', { detail: habitsError?.message });
      return NextResponse.json(
        { error: 'Error fetching habits' },
        { status: 500 }
      );
    }

    const now = new Date();
    let awardedCount = 0;
    let revokedCount = 0;

    for (const habit of allHabits) {
      const habitStartDate = new Date(habit.created_at);
      const daysSinceStart = Math.floor((now.getTime() - habitStartDate.getTime()) / (1000 * 60 * 60 * 24));

      const { data: logs, error: logsError } = await supabaseAdmin
        .from('habit_logs')
        .select('completed, log_date')
        .eq('habit_id', habit.id)
        .order('log_date', { ascending: false })
        .limit(Math.max(IDENTITY_THRESHOLD_DAYS, REVOKE_THRESHOLD_CONSECUTIVE_DAYS));

      if (logsError) {
        logger.error('Error fetching logs for habit', { habitId: habit.id, detail: logsError.message });
        continue;
      }

      if (!logs || logs.length === 0) continue;

      const completedDays = logs.filter(log => log.completed).length;
      const completionRate = logs.length > 0
        ? Math.round((completedDays / logs.length) * 100)
        : 0;

      const buildingEarned = daysSinceStart >= BUILDING_THRESHOLD_DAYS && completionRate >= BUILDING_THRESHOLD_COMPLETION;
      const identityEarned = daysSinceStart >= IDENTITY_THRESHOLD_DAYS && completionRate >= IDENTITY_THRESHOLD_COMPLETION;

      const { data: existingBadges } = await supabaseAdmin
        .from('habit_badges')
        .select('id, badge_type, revoked_at')
        .eq('habit_id', habit.id)
        .eq('user_id', habit.user_id);

      const buildingBadge = existingBadges?.find(b => b.badge_type === 'building');
      const identityBadge = existingBadges?.find(b => b.badge_type === 'identity');

      if (buildingEarned && !buildingBadge) {
        await supabaseAdmin
          .from('habit_badges')
          .insert({
            user_id: habit.user_id,
            habit_id: habit.id,
            badge_type: 'building',
            earned_at: new Date().toISOString(),
          });
        awardedCount++;
        logger.info('Building badge awarded', { habitId: habit.id, userId: habit.user_id });
      } else if (!buildingEarned && buildingBadge && !buildingBadge.revoked_at) {
        await supabaseAdmin
          .from('habit_badges')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', buildingBadge.id);
        revokedCount++;
        logger.info('Building badge revoked', { habitId: habit.id, userId: habit.user_id });
      }

      if (identityEarned && !identityBadge) {
        await supabaseAdmin
          .from('habit_badges')
          .insert({
            user_id: habit.user_id,
            habit_id: habit.id,
            badge_type: 'identity',
            earned_at: new Date().toISOString(),
          });
        awardedCount++;
        logger.info('Identity badge awarded', { habitId: habit.id, userId: habit.user_id });
      } else if (!identityEarned && identityBadge && !identityBadge.revoked_at) {
        await supabaseAdmin
          .from('habit_badges')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', identityBadge.id);
        revokedCount++;
        logger.info('Identity badge revoked', { habitId: habit.id, userId: habit.user_id });
      }
    }

    return NextResponse.json({
      success: true,
      awardedCount,
      revokedCount,
      totalHabitsProcessed: allHabits.length,
    });
  } catch (error) {
    logger.error('Error in check-badges cron', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
