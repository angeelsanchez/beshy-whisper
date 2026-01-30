import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function PUT(request: NextRequest) {
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
    const { entryId, mensaje, is_private } = body;
    
    if (!entryId) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Campo requerido: entryId' },
        { status: 400 }
      );
    }
    
    // Check if this is just a privacy update or a full edit
    const isPrivacyUpdate = is_private !== undefined && !mensaje;
    const isMessageUpdate = mensaje !== undefined;
    
    if (!isPrivacyUpdate && !isMessageUpdate) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Se requiere mensaje o cambio de privacidad' },
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
    
    // Validate UUID
    if (!isValidUUID(entryId)) {
      console.error('ID de entrada inválido:', entryId);
      return NextResponse.json(
        { error: 'ID de entrada inválido' },
        { status: 400 }
      );
    }
    
    // Verificar que el post pertenece al usuario
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('entries')
      .select('user_id')
      .eq('id', entryId)
      .single();
    
    if (fetchError) {
      console.error('Error al verificar la propiedad del post:', fetchError);
      return NextResponse.json(
        { error: 'Error al verificar la propiedad del post' },
        { status: 500 }
      );
    }
    
    if (!entry) {
      return NextResponse.json(
        { error: 'Post no encontrado' },
        { status: 404 }
      );
    }
    
    if (entry.user_id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado - No puedes editar posts de otros usuarios' },
        { status: 403 }
      );
    }
    
    // Preparar los datos de actualización
    const updateData: Record<string, unknown> = {};
    
    if (isMessageUpdate) {
      updateData.mensaje = mensaje;
      updateData.edited = true; // Marcar como editado solo si se cambió el mensaje
    }
    
    if (isPrivacyUpdate) {
      updateData.is_private = is_private;
    }
    
    // Actualizar el post
    const { error: updateError } = await supabaseAdmin
      .from('entries')
      .update(updateData)
      .eq('id', entryId);
    
    if (updateError) {
      console.error('Error al actualizar el post:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el post' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Post actualizado correctamente'
    });
  } catch (error) {
    console.error('Error inesperado en la API de actualización de posts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 