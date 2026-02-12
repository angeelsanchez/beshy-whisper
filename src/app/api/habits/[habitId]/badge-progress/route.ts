import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';

const BUILDING_THRESHOLD_DAYS = 21;
const BUILDING_THRESHOLD_COMPLETION = 80;
const IDENTITY_THRESHOLD_DAYS = 90;
const IDENTITY_THRESHOLD_COMPLETION = 90;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { habitId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('user_id, created_at')
      .eq('id', habitId)
      .single();

    if (habitError || !habit) {
      logger.error('Error fetching habit', { detail: habitError?.message });
      return NextResponse.json(
        { error: 'Hábito no encontrado' },
        { status: 404 }
      );
    }

    if (habit.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const now = new Date();
    const habitStartDate = new Date(habit.created_at);
    const daysSinceStart = Math.floor((now.getTime() - habitStartDate.getTime()) / (1000 * 60 * 60 * 24));

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('habit_logs')
      .select('completed, log_date')
      .eq('habit_id', habitId)
      .eq('user_id', session.user.id)
      .order('log_date', { ascending: false })
      .limit(Math.max(IDENTITY_THRESHOLD_DAYS, BUILDING_THRESHOLD_DAYS));

    if (logsError) {
      logger.error('Error fetching logs', { detail: logsError.message });
      return NextResponse.json(
        { error: 'Error al cargar registros' },
        { status: 500 }
      );
    }

    const completedDays = (logs || []).filter(log => log.completed).length;
    const completionRate = logs && logs.length > 0
      ? Math.round((completedDays / logs.length) * 100)
      : 0;

    const buildingProgress = {
      daysRequired: BUILDING_THRESHOLD_DAYS,
      daysCompleted: Math.min(daysSinceStart, BUILDING_THRESHOLD_DAYS),
      completionRequired: BUILDING_THRESHOLD_COMPLETION,
      completionCurrent: completionRate,
      isEarned: daysSinceStart >= BUILDING_THRESHOLD_DAYS && completionRate >= BUILDING_THRESHOLD_COMPLETION,
    };

    const identityProgress = {
      daysRequired: IDENTITY_THRESHOLD_DAYS,
      daysCompleted: Math.min(daysSinceStart, IDENTITY_THRESHOLD_DAYS),
      completionRequired: IDENTITY_THRESHOLD_COMPLETION,
      completionCurrent: completionRate,
      isEarned: daysSinceStart >= IDENTITY_THRESHOLD_DAYS && completionRate >= IDENTITY_THRESHOLD_COMPLETION,
    };

    return NextResponse.json({
      success: true,
      building: buildingProgress,
      identity: identityProgress,
    });
  } catch (error) {
    logger.error('Error in badge-progress API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
