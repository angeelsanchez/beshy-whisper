import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { initiativeProgressQuerySchema } from '@/lib/schemas/initiatives';
import { logger } from '@/lib/logger';
import { UUID_REGEX } from '@/lib/constants';
import { getTodayDate } from '@/utils/date-helpers';

interface RouteParams {
  params: Promise<{ initiativeId: string }>;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'Invalid initiative ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const parsed = initiativeProgressQuerySchema.safeParse({
      days: url.searchParams.get('days') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { days } = parsed.data;

    const { data: initiative, error: initError } = await supabaseAdmin
      .from('initiatives')
      .select('id, participant_count, community_streak, start_date, end_date')
      .eq('id', initiativeId)
      .eq('is_active', true)
      .maybeSingle();

    if (initError || !initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    const dateRange = getDateRange(days);
    const firstDate = dateRange[0];
    const lastDate = dateRange[dateRange.length - 1];

    const { data: logs } = await supabaseAdmin
      .from('initiative_logs')
      .select('completed_at, user_id')
      .eq('initiative_id', initiativeId)
      .gte('completed_at', firstDate)
      .lte('completed_at', lastDate);

    const logsByDate = new Map<string, Set<string>>();
    for (const log of logs ?? []) {
      const set = logsByDate.get(log.completed_at) ?? new Set();
      set.add(log.user_id);
      logsByDate.set(log.completed_at, set);
    }

    const totalParticipants = Math.max(initiative.participant_count, 1);
    const today = getTodayDate();

    const weekly = dateRange.map(date => {
      const completedCount = logsByDate.get(date)?.size ?? 0;
      return {
        date,
        completed_count: completedCount,
        total_participants: totalParticipants,
        completion_rate: Math.round((completedCount / totalParticipants) * 100),
      };
    });

    const todayData = weekly.find(d => d.date === today) ?? {
      date: today,
      completed_count: 0,
      total_participants: totalParticipants,
      completion_rate: 0,
    };

    let totalDays = 0;
    let daysCompleted = 0;
    if (initiative.start_date) {
      const start = new Date(initiative.start_date);
      const end = initiative.end_date ? new Date(initiative.end_date) : new Date();
      const todayDate = new Date(today);
      const effectiveEnd = end < todayDate ? end : todayDate;
      totalDays = Math.max(0, Math.floor((effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const { data: allLogs } = await supabaseAdmin
        .from('initiative_logs')
        .select('completed_at, user_id')
        .eq('initiative_id', initiativeId)
        .gte('completed_at', initiative.start_date)
        .lte('completed_at', today);

      const daySet = new Set((allLogs ?? []).map(l => l.completed_at));
      daysCompleted = daySet.size;
    }

    return NextResponse.json({
      today: todayData,
      weekly,
      community_streak: initiative.community_streak,
      total_days: totalDays,
      days_completed: daysCompleted,
    });
  } catch (error) {
    logger.error('Error in initiative progress GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
