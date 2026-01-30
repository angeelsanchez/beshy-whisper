import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { updatePostSchema } from '@/lib/schemas/posts';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';

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
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Se requiere entryId y mensaje o cambio de privacidad' },
        { status: 400 }
      );
    }
    const { entryId, mensaje, is_private } = parsed.data;

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
    
    // Verificar que el post pertenece al usuario
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('entries')
      .select('user_id')
      .eq('id', entryId)
      .single();
    
    if (fetchError) {
      logger.error('Error al verificar la propiedad del post', { detail: fetchError?.message || String(fetchError) });
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

    if (mensaje !== undefined) {
      updateData.mensaje = mensaje;
      updateData.edited = true;
    }

    if (is_private !== undefined) {
      updateData.is_private = is_private;
    }
    
    // Actualizar el post
    const { error: updateError } = await supabaseAdmin
      .from('entries')
      .update(updateData)
      .eq('id', entryId);
    
    if (updateError) {
      logger.error('Error al actualizar el post', { detail: updateError?.message || String(updateError) });
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
    logger.error('Error inesperado en la API de actualización de posts', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 