import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { initiativeCheckinSchema } from '@/lib/schemas/initiatives';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';
import { UUID_REGEX } from '@/lib/constants';
import { getTodayDate } from '@/utils/date-helpers';

interface RouteParams {
  params: Promise<{ initiativeId: string }>;
}

function isFutureDate(dateStr: string): boolean {
  return dateStr > getTodayDate();
}

function isDateInRange(date: string, startDate: string, endDate: string | null): boolean {
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

async function getCommunityProgress(
  initiativeId: string,
  date: string,
  participantCount: number
): Promise<{ completed_count: number; total_participants: number; completion_rate: number; is_perfect_day: boolean }> {
  const { data: logs } = await supabaseAdmin
    .from('initiative_logs')
    .select('user_id')
    .eq('initiative_id', initiativeId)
    .eq('completed_at', date);

  const completedCount = logs?.length ?? 0;
  const total = Math.max(participantCount, 1);
  const rate = Math.round((completedCount / total) * 100);

  return {
    completed_count: completedCount,
    total_participants: participantCount,
    completion_rate: rate,
    is_perfect_day: completedCount >= participantCount && participantCount > 0,
  };
}

async function checkAndSendMilestoneNotifications(
  initiativeId: string,
  initiativeName: string,
  previousRate: number,
  newRate: number,
  participantCount: number
): Promise<{ type: string; message: string } | null> {
  const thresholds = [
    { pct: 50, msg: `50% en ${initiativeName}`, body: 'La mitad del equipo completó' },
    { pct: 75, msg: `75% en ${initiativeName}!`, body: 'Casi todos han completado' },
    { pct: 100, msg: `Día perfecto en ${initiativeName}!`, body: 'Todos completaron hoy' },
  ];

  let milestone: { type: string; message: string } | null = null;

  for (const t of thresholds) {
    if (previousRate < t.pct && newRate >= t.pct) {
      milestone = { type: `community_${t.pct}`, message: t.msg };

      if (participantCount <= 50) {
        const { data: participants } = await supabaseAdmin
          .from('initiative_participants')
          .select('user_id')
          .eq('initiative_id', initiativeId)
          .eq('is_active', true);

        for (const p of participants ?? []) {
          sendPushToUserIfEnabled(p.user_id, {
            title: t.msg,
            body: t.body,
            tag: `init-${t.pct}-${initiativeId}`,
            data: { url: `/initiatives/${initiativeId}`, type: 'initiative_milestone' },
          }, 'initiative_checkin').catch(() => {});
        }
      }
    }
  }

  return milestone;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = initiativeCheckinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const date = parsed.data.date ?? getTodayDate();

    if (isFutureDate(date)) {
      return NextResponse.json({ error: 'Cannot check in for future dates' }, { status: 400 });
    }

    const { data: initiative, error: initError } = await supabaseAdmin
      .from('initiatives')
      .select('id, name, is_active, tracking_type, target_value, start_date, end_date, participant_count')
      .eq('id', initiativeId)
      .maybeSingle();

    if (initError || !initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    if (!initiative.is_active) {
      return NextResponse.json({ error: 'Initiative is not active' }, { status: 400 });
    }

    if (!isDateInRange(date, initiative.start_date, initiative.end_date)) {
      return NextResponse.json({ error: 'Date is outside the initiative period' }, { status: 400 });
    }

    const { data: participation } = await supabaseAdmin
      .from('initiative_participants')
      .select('id')
      .eq('initiative_id', initiativeId)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const previousProgress = await getCommunityProgress(initiativeId, date, initiative.participant_count);

    const { data: existingLog } = await supabaseAdmin
      .from('initiative_logs')
      .select('id, value')
      .eq('initiative_id', initiativeId)
      .eq('user_id', session.user.id)
      .eq('completed_at', date)
      .maybeSingle();

    if (initiative.tracking_type === 'quantity' || initiative.tracking_type === 'timer') {
      const incomingValue = parsed.data.value ?? 1;
      const targetValue = initiative.target_value ?? 1;

      if (existingLog) {
        const currentValue = Number(existingLog.value ?? 0);
        const newValue = Math.max(0, currentValue + incomingValue);

        if (newValue <= 0) {
          await supabaseAdmin.from('initiative_logs').delete().eq('id', existingLog.id);
          const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
          return NextResponse.json({
            action: 'removed', completed: false, date, value: 0,
            community_progress: progress, milestone: null,
          });
        }

        await supabaseAdmin.from('initiative_logs').update({ value: newValue }).eq('id', existingLog.id);
        const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
        const milestone = await checkAndSendMilestoneNotifications(
          initiativeId, initiative.name, previousProgress.completion_rate, progress.completion_rate, initiative.participant_count
        );
        return NextResponse.json({
          action: 'updated', completed: newValue >= targetValue, date, value: newValue,
          community_progress: progress, milestone,
        });
      }

      const initialValue = Math.max(0, incomingValue);
      const { error: insertError } = await supabaseAdmin
        .from('initiative_logs')
        .insert({ initiative_id: initiativeId, user_id: session.user.id, completed_at: date, value: initialValue });

      if (insertError) {
        if (insertError.code === '23505') {
          const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
          return NextResponse.json({
            action: 'already_logged', completed: false, date, value: 0,
            community_progress: progress, milestone: null,
          });
        }
        logger.error('Error creating initiative log', { detail: insertError.message });
        return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
      }

      const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
      const milestone = await checkAndSendMilestoneNotifications(
        initiativeId, initiative.name, previousProgress.completion_rate, progress.completion_rate, initiative.participant_count
      );

      logger.info('Initiative checkin (quantity)', { userId: session.user.id, initiativeId, date, value: initialValue });
      return NextResponse.json({
        action: 'checked_in', completed: initialValue >= targetValue, date, value: initialValue,
        community_progress: progress, milestone,
      });
    }

    if (existingLog) {
      await supabaseAdmin.from('initiative_logs').delete().eq('id', existingLog.id);
      const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
      logger.info('Initiative checkin removed', { userId: session.user.id, initiativeId, date });
      return NextResponse.json({
        action: 'removed', completed: false, date, value: null,
        community_progress: progress, milestone: null,
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('initiative_logs')
      .insert({ initiative_id: initiativeId, user_id: session.user.id, completed_at: date });

    if (insertError) {
      if (insertError.code === '23505') {
        const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
        return NextResponse.json({
          action: 'already_logged', completed: true, date, value: null,
          community_progress: progress, milestone: null,
        });
      }
      logger.error('Error creating initiative log', { detail: insertError.message });
      return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
    }

    const progress = await getCommunityProgress(initiativeId, date, initiative.participant_count);
    const milestone = await checkAndSendMilestoneNotifications(
      initiativeId, initiative.name, previousProgress.completion_rate, progress.completion_rate, initiative.participant_count
    );

    logger.info('Initiative checkin (binary)', { userId: session.user.id, initiativeId, date });
    return NextResponse.json({
      action: 'checked_in', completed: true, date, value: null,
      community_progress: progress, milestone,
    });
  } catch (error) {
    logger.error('Error in initiative checkin POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
