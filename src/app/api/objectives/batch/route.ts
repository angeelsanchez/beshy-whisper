import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabase } from '@/lib/supabase';
import { authOptions } from '../../auth/[...nextauth]/auth';

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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
    const { objectives } = body;
    
    if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Campo requerido: objectives (array)' },
        { status: 400 }
      );
    }
    
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
    
    // Validar que todos los entry_id son válidos
    const invalidEntryIds = objectives.filter(obj => !isValidUUID(obj.entry_id));
    if (invalidEntryIds.length > 0) {
      return NextResponse.json(
        { error: 'ID de entrada inválido' },
        { status: 400 }
      );
    }
    
    console.log('Guardando objetivos:', objectives);
    
    // Guardar los objetivos en la base de datos
    const { data, error } = await supabase
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