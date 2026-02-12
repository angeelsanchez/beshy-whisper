import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { z } from 'zod';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';

const decreaseLevelSchema = z.object({
  confirm: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ habitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - Sesión no válida' },
        { status: 401 }
      );
    }

    const { habitId } = await params;

    // Validate IDs
    if (!uuidSchema.safeParse(habitId).success) {
      return NextResponse.json(
        { error: 'ID de hábito inválido' },
        { status: 400 }
      );
    }

    if (!uuidSchema.safeParse(session.user.id).success) {
      logger.error('ID de usuario inválido', { userId: session.user.id });
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = decreaseLevelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Se requiere confirm: true' },
        { status: 400 }
      );
    }

    const { confirm } = parsed.data;
    if (!confirm) {
      return NextResponse.json(
        { error: 'Debes confirmar la acción para bajar de nivel' },
        { status: 400 }
      );
    }

    // Get the habit and verify ownership
    const { data: habit, error: habitError } = await supabaseAdmin
      .from('habits')
      .select('user_id, current_level, has_progression, level_started_at')
      .eq('id', habitId)
      .single();

    if (habitError || !habit) {
      logger.error('Error al obtener hábito', { detail: habitError?.message || 'Hábito no encontrado' });
      return NextResponse.json(
        { error: 'Hábito no encontrado' },
        { status: 404 }
      );
    }

    if (habit.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes modificar hábitos de otros usuarios' },
        { status: 403 }
      );
    }

    // Check if habit has progression enabled
    if (!habit.has_progression) {
      return NextResponse.json(
        { error: 'Este hábito no tiene progresión habilitada' },
        { status: 400 }
      );
    }

    // Check if we can decrease level (must be at level > 1)
    if (habit.current_level <= 1) {
      return NextResponse.json(
        { error: 'No puedes bajar de nivel más' },
        { status: 400 }
      );
    }

    const previousLevel = habit.current_level;
    const newLevel = habit.current_level - 1;

    // Get the previous level data
    const { data: previousLevelData, error: prevLevelError } = await supabaseAdmin
      .from('habit_levels')
      .select('target_days, weekly_target, target_value')
      .eq('habit_id', habitId)
      .eq('level_number', newLevel)
      .single();

    if (prevLevelError || !previousLevelData) {
      logger.error('Error al obtener datos del nivel anterior', { detail: prevLevelError?.message || 'Nivel no encontrado' });
      return NextResponse.json(
        { error: 'Error al obtener datos del nivel anterior' },
        { status: 500 }
      );
    }

    // Update the habit
    const { error: updateError } = await supabaseAdmin
      .from('habits')
      .update({
        current_level: newLevel,
        level_started_at: new Date().toISOString(),
        target_days: previousLevelData.target_days,
        weekly_target: previousLevelData.weekly_target,
        target_value: previousLevelData.target_value,
      })
      .eq('id', habitId);

    if (updateError) {
      logger.error('Error al bajar de nivel', { detail: updateError?.message || String(updateError) });
      return NextResponse.json(
        { error: 'Error al bajar de nivel' },
        { status: 500 }
      );
    }

    logger.info('Hábito disminuido de nivel', { habitId, previousLevel, newLevel });

    return NextResponse.json({
      success: true,
      message: 'Nivel disminuido correctamente',
      previousLevel,
      currentLevel: newLevel,
      levelData: previousLevelData,
    });
  } catch (error) {
    logger.error('Error inesperado en la API de disminuir nivel', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
