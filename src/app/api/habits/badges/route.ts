import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    interface BadgeRow {
      id: string;
      habit_id: string;
      badge_type: string;
      earned_at: string;
      revoked_at: string | null;
      habits: { name: string } | null;
    }

    const { data: badges, error } = await supabaseAdmin
      .from('habit_badges')
      .select(`
        id,
        habit_id,
        badge_type,
        earned_at,
        revoked_at,
        habits!inner(name)
      `)
      .eq('user_id', session.user.id)
      .is('revoked_at', null)
      .order('earned_at', { ascending: false });

    if (error) {
      logger.error('Error fetching badges', { detail: error.message });
      return NextResponse.json(
        { error: 'Error al cargar insignias' },
        { status: 500 }
      );
    }

    const formattedBadges = ((badges as unknown as BadgeRow[]) || []).map(badge => ({
      id: badge.id,
      habitId: badge.habit_id,
      habitName: badge.habits?.name || 'Hábito desconocido',
      type: badge.badge_type,
      earnedAt: badge.earned_at,
    }));

    return NextResponse.json({
      success: true,
      badges: formattedBadges,
    });
  } catch (error) {
    logger.error('Error in badges API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
