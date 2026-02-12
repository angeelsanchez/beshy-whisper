import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPushToUser } from '@/lib/push-notify';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, likerUserId } = body;

    if (!entryId || !likerUserId) {
      return NextResponse.json(
        { error: 'Missing required data: entryId and likerUserId' },
        { status: 400 }
      );
    }

    const { data: entryData, error: entryError } = await supabaseAdmin
      .from('entries')
      .select('user_id, mensaje')
      .eq('id', entryId)
      .single();

    if (entryError || !entryData) {
      logger.error('Error fetching entry', { detail: entryError?.message || String(entryError) });
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    if (entryData.user_id === likerUserId) {
      return NextResponse.json({
        success: true,
        message: 'Self-like, no notification needed'
      });
    }

    const { data: likerData, error: likerError } = await supabaseAdmin
      .from('users')
      .select('bsy_id, name')
      .eq('id', likerUserId)
      .single();

    if (likerError || !likerData) {
      logger.error('Error fetching liker data', { detail: likerError?.message || String(likerError) });
      return NextResponse.json(
        { error: 'Liker user not found' },
        { status: 404 }
      );
    }

    const likerName = likerData.name || likerData.bsy_id || 'Alguien';

    const sent = await sendPushToUser(entryData.user_id, {
      title: '❤️ Nuevo like en tu Whisper',
      body: `${likerName} le dio like a tu whisper`,
      tag: 'like-notification',
      data: {
        url: `/feed?highlight=${entryId}`,
        type: 'like',
        entry_id: entryId,
        liker_user_id: likerUserId,
        liker_name: likerName
      }
    });

    return NextResponse.json({
      success: true,
      message: sent ? 'Like notification sent successfully' : 'No push token registered'
    });
  } catch (error) {
    logger.error('Error in send-like notification', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
