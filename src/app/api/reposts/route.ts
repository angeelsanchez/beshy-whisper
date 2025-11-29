import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { toggleRepostSchema } from '@/lib/schemas/reposts';
import { uuidSchema } from '@/lib/schemas/common';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

async function sendRepostNotification(entryId: string, reposterUserId: string): Promise<void> {
  const { data: entryData, error: entryError } = await supabaseAdmin
    .from('entries')
    .select('user_id')
    .eq('id', entryId)
    .single();

  if (entryError || !entryData) {
    logger.error('Error fetching entry for repost notification', { detail: entryError?.message || String(entryError) });
    return;
  }

  if (entryData.user_id === reposterUserId) return;

  const { data: reposterData, error: reposterError } = await supabaseAdmin
    .from('users')
    .select('bsy_id, name')
    .eq('id', reposterUserId)
    .single();

  if (reposterError || !reposterData) {
    logger.error('Error fetching reposter data', { detail: reposterError?.message || String(reposterError) });
    return;
  }

  const reposterName = reposterData.name || reposterData.bsy_id || 'Alguien';

  await sendPushToUserIfEnabled(entryData.user_id, {
    title: '🔁 Tu whisper fue reposteado',
    body: `${reposterName} reposteó tu whisper`,
    tag: 'repost-notification',
    data: {
      url: `/feed?highlight=${entryId}`,
      type: 'repost',
      entry_id: entryId,
      reposter_user_id: reposterUserId,
      reposter_name: reposterName,
    },
  }, 'repost');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = toggleRepostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { entryId } = parsed.data;

    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!uuidSchema.safeParse(userId).success) {
      logger.error('Invalid user ID in repost', { userId });
      return NextResponse.json(
        { error: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    logger.info('Processing repost toggle', { userId, entryId });

    const { data: existingRepost, error: checkError } = await supabaseAdmin
      .from('reposts')
      .select('id')
      .eq('user_id', userId)
      .eq('entry_id', entryId)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking existing repost', { detail: checkError.message });
      return NextResponse.json(
        { error: 'Error al verificar repost' },
        { status: 500 }
      );
    }

    if (existingRepost) {
      const { error: deleteError } = await supabaseAdmin
        .from('reposts')
        .delete()
        .eq('user_id', userId)
        .eq('entry_id', entryId);

      if (deleteError) {
        logger.error('Error removing repost', { detail: deleteError.message });
        return NextResponse.json(
          { error: 'Error al quitar repost' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'unreposted',
        reposted: false,
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from('reposts')
      .insert({ user_id: userId, entry_id: entryId });

    if (insertError) {
      logger.error('Error adding repost', { detail: insertError.message });
      return NextResponse.json(
        { error: 'Error al repostear' },
        { status: 500 }
      );
    }

    sendRepostNotification(entryId, userId).catch(err => {
      logger.error('Failed to send repost notification', { detail: err instanceof Error ? err.message : String(err) });
    });

    return NextResponse.json({
      success: true,
      action: 'reposted',
      reposted: true,
    });
  } catch (error) {
    logger.error('Unexpected error in reposts API', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
