import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

interface ObjectiveRow {
  id: string;
  text: string;
  done: boolean;
}

function getLastWeekDateRange(): { start: string; end: string } {
  const now = new Date();
  const currentDay = now.getDay();

  const daysToStartOfWeek = currentDay === 0 ? 6 : currentDay - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToStartOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(weekStart.getDate() - 1);
  lastWeekEnd.setHours(23, 59, 59, 999);

  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
  lastWeekStart.setHours(0, 0, 0, 0);

  return {
    start: lastWeekStart.toISOString(),
    end: lastWeekEnd.toISOString(),
  };
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { start, end } = getLastWeekDateRange();

    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('entries')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('franja', 'SEMANA')
      .gte('fecha', start)
      .lte('fecha', end);

    if (entriesError) {
      logger.error('Error fetching last week entries', { detail: entriesError.message });
      return NextResponse.json(
        { error: 'Error al cargar objetivos' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        objectives: [],
      });
    }

    const entryId = entries[0].id;

    const { data: objectives, error: objectivesError } = await supabaseAdmin
      .from('objectives')
      .select('id, text, done')
      .eq('entry_id', entryId)
      .order('created_at', { ascending: true });

    if (objectivesError) {
      logger.error('Error fetching objectives', { detail: objectivesError.message });
      return NextResponse.json(
        { error: 'Error al cargar objetivos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      objectives: (objectives as ObjectiveRow[]) || [],
    });
  } catch (error) {
    logger.error('Error in previous-week objectives API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
