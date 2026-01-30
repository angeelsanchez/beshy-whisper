import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';

// Helper function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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
    const entryId = searchParams.get('entryId');
    
    if (!entryId) {
      return NextResponse.json(
        { error: 'Solicitud inválida. Campo requerido: entryId' },
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
    
    // Validate UUIDs
    if (!isValidUUID(userId)) {
      console.error('ID de usuario inválido:', userId);
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }
    
    if (!isValidUUID(entryId)) {
      console.error('ID de entrada inválido:', entryId);
      return NextResponse.json(
        { error: 'ID de entrada inválido' },
        { status: 400 }
      );
    }
    
    console.log('Procesando eliminación de post:', { userId, entryId });
    
    // First verify that the entry belongs to the user
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
      console.error('Error al eliminar likes asociados:', likesDeleteError);
      // Continue with deletion even if likes deletion fails
    }
    
    // Delete the entry
    const { error: deleteError } = await supabaseAdmin
      .from('entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error al eliminar el post:', deleteError);
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
    console.error('Error inesperado en la API de eliminación de posts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 