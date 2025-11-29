import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const filePath = `${userId}.webp`;

    const { error: removeError } = await supabaseAdmin.storage
      .from('avatars')
      .remove([filePath]);

    if (removeError) {
      logger.warn('Error removing avatar from storage', { detail: removeError.message });
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ profile_photo_url: null })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error clearing profile_photo_url', { detail: updateError.message });
      return NextResponse.json({ error: 'Error al eliminar la foto' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Foto eliminada' });
  } catch (error) {
    logger.error('Delete photo error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
