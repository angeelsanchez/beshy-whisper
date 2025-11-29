import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 512 * 1024;
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  const bytes = new Uint8Array(buffer);
  return signatures.some((sig) =>
    sig.every((byte, i) => bytes[i] === byte)
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await req.formData();
    const file = formData.get('photo');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 512KB' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa WebP, JPEG o PNG' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json({ error: 'El contenido del archivo no coincide con su tipo' }, { status: 400 });
    }

    const filePath = `${userId}.webp`;

    const { error: removeError } = await supabaseAdmin.storage
      .from('avatars')
      .remove([filePath]);

    if (removeError) {
      logger.warn('Error removing old avatar (may not exist)', { detail: removeError.message });
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      logger.error('Error uploading avatar', { detail: uploadError.message });
      return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ profile_photo_url: photoUrl })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating profile_photo_url', { detail: updateError.message });
      return NextResponse.json({ error: 'Error al actualizar el perfil' }, { status: 500 });
    }

    return NextResponse.json({ profile_photo_url: photoUrl });
  } catch (error) {
    logger.error('Update photo error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
