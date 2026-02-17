import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const chartDataSchema = z.object({
  view: z.enum(['week', 'month', 'year']).default('week'),
  habitIds: z.array(z.string().uuid()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const view = (searchParams.get('view') || 'week') as 'week' | 'month' | 'year';
    const habitIdsParam = searchParams.get('habitIds');
    const habitIds = habitIdsParam ? habitIdsParam.split(',') : [];

    const parsed = chartDataSchema.safeParse({ view, habitIds });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const { view: chartView, habitIds: selectedHabits } = parsed.data;
    const now = new Date();
    let startDate: Date;

    if (chartView === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
    } else if (chartView === 'month') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 27);
    } else {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 11);
    }

    const { data: habits, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, name')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (habitsError || !habits) {
      logger.error('Error fetching habits', { detail: habitsError?.message });
      return NextResponse.json(
        { error: 'Error al cargar hábitos' },
        { status: 500 }
      );
    }

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('habit_logs')
      .select('habit_id, completed_at, value')
      .eq('user_id', session.user.id)
      .gte('completed_at', startDate.toISOString().split('T')[0])
      .lte('completed_at', now.toISOString().split('T')[0])
      .order('completed_at', { ascending: true });

    if (logsError) {
      logger.error('Error fetching habit logs', { detail: logsError.message });
      return NextResponse.json(
        { error: 'Error al cargar registros' },
        { status: 500 }
      );
    }

    const globalData = calculateGlobalChartData(logs || [], habits.length, chartView);
    const selectedHabitsData = selectedHabits.length > 0
      ? calculateIndividualHabitsData(logs || [], selectedHabits, habits, chartView)
      : [];

    return NextResponse.json({
      success: true,
      global: globalData,
      habits: selectedHabitsData,
      availableHabits: habits.map(h => ({ id: h.id, name: h.name })),
    });
  } catch (error) {
    logger.error('Error in chart-data API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

type HabitLog = { habit_id: string; completed_at: string; value: number | null };

function calculateGlobalChartData(
  logs: HabitLog[],
  totalHabits: number,
  view: 'week' | 'month' | 'year'
) {
  if (view === 'week') {
    const weekData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const completedCount = logs.filter(log => log.completed_at === dateStr).length;
      const percentage = totalHabits > 0
        ? Math.round((completedCount / totalHabits) * 100)
        : 0;

      weekData.push({
        date: dateStr,
        label: date.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 1),
        percentage,
      });
    }

    return weekData;
  } else if (view === 'month') {
    const monthData = [];
    const today = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() || 7) - i * 7 + 1);

      const weekLogs = logs.filter(log => {
        const logDate = new Date(log.completed_at);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return logDate >= weekStart && logDate <= weekEnd;
      });

      const completedCount = weekLogs.length;
      const expectedTotal = totalHabits * 7;
      const percentage = expectedTotal > 0
        ? Math.round((completedCount / expectedTotal) * 100)
        : 0;

      monthData.push({
        week: `S${4 - i}`,
        label: `Semana ${4 - i}`,
        percentage,
      });
    }

    return monthData;
  } else {
    const yearData = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(today);
      monthDate.setMonth(today.getMonth() - i);

      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthLogs = logs.filter(log => {
        const logDate = new Date(log.completed_at);
        return logDate >= monthStart && logDate <= monthEnd;
      });

      const completedCount = monthLogs.length;
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      const expectedTotal = totalHabits * daysInMonth;
      const percentage = expectedTotal > 0
        ? Math.round((completedCount / expectedTotal) * 100)
        : 0;

      yearData.push({
        month: monthDate.toLocaleDateString('es-ES', { month: 'short' }),
        label: monthDate.toLocaleDateString('es-ES', { month: 'long' }).slice(0, 3),
        percentage,
      });
    }

    return yearData;
  }
}

function calculateIndividualHabitsData(
  logs: HabitLog[],
  habitIds: string[],
  allHabits: Array<{ id: string; name: string }>,
  view: 'week' | 'month' | 'year'
) {
  return habitIds.slice(0, 5).map(habitId => {
    const habitName = allHabits.find(h => h.id === habitId)?.name || habitId;
    const habitLogs = logs.filter(log => log.habit_id === habitId);

    if (view === 'week') {
      const weekData = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const hasLog = habitLogs.some(log => log.completed_at === dateStr);
        const percentage = hasLog ? 100 : 0;

        weekData.push({
          date: dateStr,
          percentage,
        });
      }

      return { habitId, habitName, data: weekData };
    } else if (view === 'month') {
      const monthData = [];
      const today = new Date();

      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (today.getDay() || 7) - i * 7 + 1);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const completedInWeek = habitLogs.filter(log => {
          const logDate = new Date(log.completed_at);
          return logDate >= weekStart && logDate <= weekEnd;
        }).length;

        const percentage = completedInWeek > 0
          ? Math.round((completedInWeek / 7) * 100)
          : 0;

        monthData.push({
          week: `S${4 - i}`,
          percentage,
        });
      }

      return { habitId, habitName, data: monthData };
    } else {
      const yearData = [];
      const today = new Date();

      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(today);
        monthDate.setMonth(today.getMonth() - i);

        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const completedInMonth = habitLogs.filter(log => {
          const logDate = new Date(log.completed_at);
          return logDate >= monthStart && logDate <= monthEnd;
        }).length;

        const percentage = daysInMonth > 0
          ? Math.round((completedInMonth / daysInMonth) * 100)
          : 0;

        yearData.push({
          month: monthDate.toLocaleDateString('es-ES', { month: 'short' }),
          percentage,
        });
      }

      return { habitId, habitName, data: yearData };
    }
  });
}
