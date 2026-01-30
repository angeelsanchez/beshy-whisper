import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../auth/[...nextauth]/auth';
import { patchObjectiveSchema, deleteObjectiveSchema } from '@/lib/schemas/objectives';
import { uuidSchema } from '@/lib/schemas/common';

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
      console.error('ID de usuario faltante en la sesión:', session);
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      console.error('ID de usuario inválido:', userId);
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
      console.error('Error al verificar la propiedad del objetivo:', fetchError);
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
      console.error('Error al actualizar el objetivo:', updateError);
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
    console.error('Error inesperado en la API de objetivos:', error);
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
      console.error('ID de usuario faltante en la sesión:', session);
      return NextResponse.json(
        { error: 'No autorizado - ID de usuario faltante en la sesión' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      console.error('ID de usuario inválido:', userId);
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
      console.error('Error al verificar la propiedad del objetivo:', fetchError);
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
      console.error('Error al eliminar el objetivo:', deleteError);
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
    console.error('Error inesperado en la API de objetivos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 