import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { batchObjectivesSchema } from '@/lib/schemas/objectives';
import { logger } from '@/lib/logger';

// API para guardar objetivos en lote
export async function POST(request: NextRequest) {
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
    const parsed = batchObjectivesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Campo requerido: objectives (array)' },
        { status: 400 }
      );
    }
    const { objectives } = parsed.data;

    const userId = session.user.id;

    // Validate user ID
    if (!userId) {
      logger.error('ID de usuario faltante en la sesión', { userId: String(session.user?.id) });
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    // Validar que todos los objetivos pertenecen al usuario autenticado
    const invalidObjectives = objectives.filter(obj => obj.user_id !== userId);
    if (invalidObjectives.length > 0) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes crear objetivos para otros usuarios' },
        { status: 403 }
      );
    }
    
    logger.info('Guardando objetivos', { count: objectives.length });
    
    // Guardar los objetivos en la base de datos
    const { data, error } = await supabaseAdmin
      .from('objectives')
      .insert(objectives)
      .select();
    
    if (error) {
      logger.error('Error al guardar objetivos en la base de datos', { detail: error?.message || String(error) });
      return NextResponse.json(
        { error: `Error al guardar objetivos: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Objetivos guardados correctamente',
      data
    });
  } catch (error) {
    logger.error('Error inesperado en la API de objetivos', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 