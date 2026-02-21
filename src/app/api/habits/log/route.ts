import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { toggleHabitLogSchema } from '@/lib/schemas/habits';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';
import { countRetomas } from '@/utils/habit-helpers';

interface MilestoneResult {
  type: '21_reps' | '66_reps' | 'first_retoma' | '3_retomas';
  message: string;
}

interface ExistingLog {
  id: string;
  value: number | null;
}

interface QuantityLogParams {
  existingLog: ExistingLog | null;
  habitId: string;
  userId: string;
  date: string;
  incomingValue: number;
  targetValue: number;
  habitName: string;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isValidDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isFutureDate(dateStr: string): boolean {
  return dateStr > getTodayDate();
}

async function sendMilestoneNotification(userId: string, milestone: MilestoneResult, habitName: string): Promise<void> {
  await sendPushToUserIfEnabled(userId, {
    title: milestone.message,
    body: `Hábito: ${habitName}`,
    tag: `habit-milestone-${milestone.type}`,
    data: { url: '/habits', type: 'habit_milestone' },
  }, 'habit_milestone');
}

function detectMilestone(
  totalReps: number,
  previousTotalReps: number,
  retomaCount: number,
  previousRetomaCount: number
): MilestoneResult | null {
  if (previousTotalReps < 21 && totalReps >= 21) {
    return { type: '21_reps', message: '21 repeticiones completadas' };
  }
  if (previousTotalReps < 66 && totalReps >= 66) {
    return { type: '66_reps', message: '¡66 repeticiones! Este hábito ya es parte de ti' };
  }
  if (previousRetomaCount === 0 && retomaCount >= 1) {
    return { type: 'first_retoma', message: '¡Has retomado un hábito, sigue así!' };
  }
  if (previousRetomaCount < 3 && retomaCount >= 3) {
    return { type: '3_retomas', message: '3 retomas exitosas. Tu resiliencia es admirable' };
  }
  return null;
}


async function notifyLinkedPartners(
  habitId: string,
  userId: string,
  userName: string,
  habitName: string
): Promise<void> {
  try {
    const { data: links } = await supabaseAdmin
      .from('habit_links')
      .select('requester_id, responder_id, requester_habit_id, responder_habit_id')
      .eq('status', 'accepted')
      .or(`requester_habit_id.eq.${habitId},responder_habit_id.eq.${habitId}`);

    if (!links || links.length === 0) return;

    for (const link of links) {
      const isRequester = link.requester_habit_id === habitId && link.requester_id === userId;
      const isResponder = link.responder_habit_id === habitId && link.responder_id === userId;
      if (!isRequester && !isResponder) continue;

      const partnerId = isRequester ? link.responder_id : link.requester_id;
      sendPushToUserIfEnabled(partnerId, {
        title: `${userName} ha completado su hábito`,
        body: habitName,
        tag: 'habit-link-completion',
        data: { url: '/habits', type: 'habit_link_completion' },
      }, 'habit_link_completion').catch(() => {});
    }
  } catch {
    // non-critical, silently fail
  }
}

async function checkMilestonesAndNotify(
  habitId: string,
  userId: string,
  habitName: string
): Promise<MilestoneResult | null> {
  const { data: allLogs, error: logsError } = await supabaseAdmin
    .from('habit_logs')
    .select('completed_at')
    .eq('habit_id', habitId)
    .order('completed_at', { ascending: true });

  if (logsError || !allLogs) return null;

  const totalReps = allLogs.length;
  const sortedDates = allLogs.map(l => l.completed_at);
  const retomaCount = countRetomas(sortedDates);
  const previousDates = sortedDates.slice(0, -1);
  const previousRetomaCount = countRetomas(previousDates);

  const milestone = detectMilestone(totalReps, totalReps - 1, retomaCount, previousRetomaCount);
  if (milestone) {
    sendMilestoneNotification(userId, milestone, habitName).catch(() => {});
  }
  return milestone;
}

async function handleQuantityLog(params: QuantityLogParams): Promise<NextResponse> {
  const { existingLog, habitId, userId, date, incomingValue, targetValue, habitName } = params;

  if (existingLog) {
    const currentValue = existingLog.value ?? 0;
    const newValue = Math.max(0, currentValue + incomingValue);

    if (newValue <= 0) {
      const { error } = await supabaseAdmin.from('habit_logs').delete().eq('id', existingLog.id);
      if (error) {
        logger.error('Error removing quantity log', { detail: error.message });
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
      }
      logger.info('Quantity log removed', { userId, habitId, date });
      return NextResponse.json({ action: 'removed', completed: false, date, value: 0 });
    }

    const { error } = await supabaseAdmin
      .from('habit_logs')
      .update({ value: newValue })
      .eq('id', existingLog.id);

    if (error) {
      logger.error('Error updating quantity log', { detail: error.message });
      return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }

    const completed = newValue >= targetValue;
    logger.info('Quantity log updated', { userId, habitId, date, value: newValue });
    return NextResponse.json({ action: 'updated', completed, date, value: newValue });
  }

  const initialValue = Math.max(0, incomingValue);
  const { error: insertError } = await supabaseAdmin
    .from('habit_logs')
    .insert({ habit_id: habitId, user_id: userId, completed_at: date, value: initialValue });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ action: 'already_logged', completed: false, date, value: 0 });
    }
    logger.error('Error creating quantity log', { detail: insertError.message });
    return NextResponse.json({ error: 'Failed to log habit' }, { status: 500 });
  }

  const completed = initialValue >= targetValue;
  const milestone = await checkMilestonesAndNotify(habitId, userId, habitName);

  logger.info('Quantity log created', { userId, habitId, date, value: initialValue });
  return NextResponse.json({
    action: 'logged',
    completed,
    date,
    value: initialValue,
    milestone: milestone ? { type: milestone.type, message: milestone.message } : null,
  });
}

async function handleBinaryLog(
  existingLog: ExistingLog | null,
  habitId: string,
  userId: string,
  date: string,
  habitName: string
): Promise<NextResponse> {
  if (existingLog) {
    const { error } = await supabaseAdmin.from('habit_logs').delete().eq('id', existingLog.id);
    if (error) {
      logger.error('Error removing habit log', { detail: error.message });
      return NextResponse.json({ error: 'Failed to remove log' }, { status: 500 });
    }
    logger.info('Habit log removed', { userId, habitId, date });
    return NextResponse.json({ action: 'removed', completed: false, date });
  }

  const { error: insertError } = await supabaseAdmin
    .from('habit_logs')
    .insert({ habit_id: habitId, user_id: userId, completed_at: date });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ action: 'already_logged', completed: true, date });
    }
    logger.error('Error creating habit log', { detail: insertError.message });
    return NextResponse.json({ error: 'Failed to log habit' }, { status: 500 });
  }

  const milestone = await checkMilestonesAndNotify(habitId, userId, habitName);

  logger.info('Habit log created', { userId, habitId, date });
  return NextResponse.json({
    action: 'logged',
    completed: true,
    date,
    milestone: milestone ? { type: milestone.type, message: milestone.message } : null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = toggleHabitLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { habitId } = parsed.data;
    const date = parsed.data.date ?? getTodayDate();

    if (!isValidDate(date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    if (isFutureDate(date)) {
      return NextResponse.json({ error: 'Cannot log future dates' }, { status: 400 });
    }

    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('id, user_id, name, is_active, tracking_type, target_value')
      .eq('id', habitId)
      .maybeSingle();

    if (habitError || !habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    if (habit.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!habit.is_active) {
      logger.warn('Attempt to log inactive habit', { habitId, userId: session.user.id });
      return NextResponse.json({ error: 'Habit is not active' }, { status: 400 });
    }

    const { data: existingLog, error: checkError } = await supabaseAdmin
      .from('habit_logs')
      .select('id, value')
      .eq('habit_id', habitId)
      .eq('completed_at', date)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking habit log', { detail: checkError.message });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let response: NextResponse;

    if (habit.tracking_type === 'quantity' || habit.tracking_type === 'timer') {
      response = await handleQuantityLog({
        existingLog,
        habitId,
        userId: session.user.id,
        date,
        incomingValue: parsed.data.value ?? 1,
        targetValue: habit.target_value ?? 1,
        habitName: habit.name,
      });
    } else {
      response = await handleBinaryLog(existingLog, habitId, session.user.id, date, habit.name);
    }

    const responseBody = await response.clone().json().catch(() => null);
    if (responseBody?.action === 'logged') {
      const userName = session.user.name || session.user.alias || 'Alguien';
      notifyLinkedPartners(habitId, session.user.id, userName, habit.name).catch(() => {});
    }

    return response;
  } catch (error) {
    logger.error('Error in habit log POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
