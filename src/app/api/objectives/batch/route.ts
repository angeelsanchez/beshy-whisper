import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { batchObjectivesSchema } from '@/lib/schemas/objectives';

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
      console.error('ID de usuario faltante en la sesión:', session);
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
    
    console.log('Guardando objetivos:', objectives);
    
    // Guardar los objetivos en la base de datos
    const { data, error } = await supabaseAdmin
      .from('objectives')
      .insert(objectives)
      .select();
    
    if (error) {
      console.error('Error al guardar objetivos en la base de datos:', error);
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
    console.error('Error inesperado en la API de objetivos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 