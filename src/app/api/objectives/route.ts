import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { patchObjectiveSchema, deleteObjectiveSchema } from '@/lib/schemas/objectives';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Crear un nuevo objetivo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado - Sesión o usuario no encontrado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const createObjectiveSchema = z.object({
      entryId: z.string().uuid('ID de entrada inválido'),
      text: z.string().min(1, 'El texto del objetivo es requerido').max(200, 'El objetivo no puede exceder 200 caracteres').trim(),
    });

    const parsed = createObjectiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Se requiere entryId y text', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { entryId, text } = parsed.data;
    const userId = session.user.id;

    if (!userId) {
      logger.error('ID de usuario faltante en la sesión', { userId: String(session.user?.id) });
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      logger.error('ID de usuario inválido', { userId });
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Verificar que el entry pertenece al usuario y es franja DIA
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('entries')
      .select('user_id, franja')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      logger.error('Error al verificar la propiedad del entry', { detail: fetchError?.message || 'Entry no encontrado' });
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    if (entry.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes crear objetivos en entradas de otros usuarios' },
        { status: 403 }
      );
    }

    if (entry.franja !== 'DIA') {
      return NextResponse.json(
        { error: 'Los objetivos solo pueden añadirse a whispers de día' },
        { status: 400 }
      );
    }

    // Crear el objetivo
    const { data: objective, error: createError } = await supabaseAdmin
      .from('objectives')
      .insert({
        entry_id: entryId,
        user_id: userId,
        text,
        done: false,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error al crear el objetivo', { detail: createError?.message || String(createError) });
      return NextResponse.json(
        { error: 'Error al crear el objetivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Objetivo creado correctamente',
      objective,
    });
  } catch (error) {
    logger.error('Error inesperado en la API de crear objetivos', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Actualizar estado de un objetivo (completado/pendiente)
export async function PATCH(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado - Sesión o usuario no encontrado' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const parsed = patchObjectiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Campos requeridos: objectiveId, done' },
        { status: 400 }
      );
    }
    const { objectiveId, done } = parsed.data;

    const userId = session.user.id;

    // Validate user ID
    if (!userId) {
      logger.error('ID de usuario faltante en la sesión', { userId: String(session.user?.id) });
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      logger.error('ID de usuario inválido', { userId });
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Verificar que el objetivo pertenece al usuario
    const { data: objective, error: fetchError } = await supabaseAdmin
      .from('objectives')
      .select('user_id')
      .eq('id', objectiveId)
      .single();

    if (fetchError) {
      logger.error('Error al verificar la propiedad del objetivo', { detail: fetchError?.message || String(fetchError) });
      return NextResponse.json(
        { error: 'Error al verificar la propiedad del objetivo' },
        { status: 500 }
      );
    }

    if (!objective) {
      return NextResponse.json(
        { error: 'Objetivo no encontrado' },
        { status: 404 }
      );
    }

    if (objective.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes modificar objetivos de otros usuarios' },
        { status: 403 }
      );
    }

    // Actualizar el objetivo
    const { error: updateError } = await supabaseAdmin
      .from('objectives')
      .update({
        done,
        updated_at: new Date().toISOString()
      })
      .eq('id', objectiveId);

    if (updateError) {
      logger.error('Error al actualizar el objetivo', { detail: updateError?.message || String(updateError) });
      return NextResponse.json(
        { error: 'Error al actualizar el objetivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Objetivo actualizado correctamente',
      done
    });
  } catch (error) {
    logger.error('Error inesperado en la API de objetivos', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Eliminar un objetivo
export async function DELETE(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado - Sesión o usuario no encontrado' },
        { status: 401 }
      );
    }

    // Get the objective ID from URL
    const { searchParams } = new URL(request.url);
    const parsed = deleteObjectiveSchema.safeParse({ objectiveId: searchParams.get('objectiveId') });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Parámetro requerido: objectiveId' },
        { status: 400 }
      );
    }
    const { objectiveId } = parsed.data;

    const userId = session.user.id;

    // Validate user ID
    if (!userId) {
      logger.error('ID de usuario faltante en la sesión', { userId: String(session.user?.id) });
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      logger.error('ID de usuario inválido', { userId });
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Verificar que el objetivo pertenece al usuario
    const { data: objective, error: fetchError } = await supabaseAdmin
      .from('objectives')
      .select('user_id')
      .eq('id', objectiveId)
      .single();

    if (fetchError) {
      logger.error('Error al verificar la propiedad del objetivo', { detail: fetchError?.message || String(fetchError) });
      return NextResponse.json(
        { error: 'Error al verificar la propiedad del objetivo' },
        { status: 500 }
      );
    }

    if (!objective) {
      return NextResponse.json(
        { error: 'Objetivo no encontrado' },
        { status: 404 }
      );
    }

    if (objective.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes eliminar objetivos de otros usuarios' },
        { status: 403 }
      );
    }

    // Eliminar el objetivo
    const { error: deleteError } = await supabaseAdmin
      .from('objectives')
      .delete()
      .eq('id', objectiveId);

    if (deleteError) {
      logger.error('Error al eliminar el objetivo', { detail: deleteError?.message || String(deleteError) });
      return NextResponse.json(
        { error: 'Error al eliminar el objetivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Objetivo eliminado correctamente'
    });
  } catch (error) {
    logger.error('Error inesperado en la API de objetivos', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Actualizar el texto de un objetivo
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado - Sesión o usuario no encontrado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateObjectiveSchema = z.object({
      objectiveId: z.string().uuid('ID de objetivo inválido'),
      text: z.string().min(1, 'El texto del objetivo es requerido').max(200, 'El objetivo no puede exceder 200 caracteres').trim(),
    });

    const parsed = updateObjectiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Se requiere objectiveId y text', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { objectiveId, text } = parsed.data;
    const userId = session.user.id;

    if (!userId) {
      logger.error('ID de usuario faltante en la sesión', { userId: String(session.user?.id) });
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      logger.error('ID de usuario inválido', { userId });
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    // Verificar que el objetivo pertenece al usuario
    const { data: objective, error: fetchError } = await supabaseAdmin
      .from('objectives')
      .select('user_id')
      .eq('id', objectiveId)
      .single();

    if (fetchError) {
      logger.error('Error al verificar la propiedad del objetivo', { detail: fetchError?.message || String(fetchError) });
      return NextResponse.json(
        { error: 'Error al verificar el objetivo' },
        { status: 500 }
      );
    }

    if (!objective) {
      return NextResponse.json(
        { error: 'Objetivo no encontrado' },
        { status: 404 }
      );
    }

    if (objective.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes actualizar objetivos de otros usuarios' },
        { status: 403 }
      );
    }

    // Actualizar el texto del objetivo
    const { error: updateError } = await supabaseAdmin
      .from('objectives')
      .update({
        text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', objectiveId);

    if (updateError) {
      logger.error('Error al actualizar el objetivo', { detail: updateError?.message || String(updateError) });
      return NextResponse.json(
        { error: 'Error al actualizar el objetivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Objetivo actualizado correctamente',
      text,
    });
  } catch (error) {
    logger.error('Error inesperado en la API de actualización de objetivos', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 