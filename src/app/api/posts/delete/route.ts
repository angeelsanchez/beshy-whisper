import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { deletePostSchema } from '@/lib/schemas/posts';
import { uuidSchema } from '@/lib/schemas/common';
import { logger } from '@/lib/logger';

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

    // Get the entry ID from URL
    const { searchParams } = new URL(request.url);
    const parsed = deletePostSchema.safeParse({ entryId: searchParams.get('entryId') });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Campo requerido: entryId' },
        { status: 400 }
      );
    }
    const { entryId } = parsed.data;

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
    
    logger.info('Procesando eliminación de post', { userId, entryId });
    
    // First verify that the entry belongs to the user
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
        { error: 'No autorizado - No puedes eliminar posts de otros usuarios' },
        { status: 403 }
      );
    }
    
    // Delete any likes associated with this entry first
    const { error: likesDeleteError } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('entry_id', entryId);
    
    if (likesDeleteError) {
      logger.error('Error al eliminar likes asociados', { detail: likesDeleteError?.message || String(likesDeleteError) });
      // Continue with deletion even if likes deletion fails
    }
    
    // Delete the entry
    const { error: deleteError } = await supabaseAdmin
      .from('entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);
    
    if (deleteError) {
      logger.error('Error al eliminar el post', { detail: deleteError?.message || String(deleteError) });
      return NextResponse.json(
        { error: 'Error al eliminar el post' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Post eliminado correctamente'
    });
  } catch (error) {
    logger.error('Error inesperado en la API de eliminación de posts', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 