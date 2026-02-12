import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { sendDmSchema, messagesQuerySchema } from '@/lib/schemas/messages';
import { areMutualFollows } from '@/lib/mutual-follow';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { UUID_REGEX } from '@/lib/constants';
const DM_PREVIEW_LENGTH = 100;

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

async function verifyConversationParticipant(
  conversationId: string,
  userId: string
): Promise<{ isParticipant: boolean; otherUserId: string | null }> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('user_a_id, user_b_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (!data) return { isParticipant: false, otherUserId: null };

  const isParticipant = data.user_a_id === userId || data.user_b_id === userId;
  const otherUserId = isParticipant
    ? data.user_a_id === userId
      ? data.user_b_id
      : data.user_a_id
    : null;

  return { isParticipant, otherUserId };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!UUID_REGEX.test(conversationId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    const { isParticipant } = await verifyConversationParticipant(
      conversationId,
      session.user.id
    );
    if (!isParticipant) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversacion' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = messagesQuerySchema.safeParse({
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametros invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cursor, limit } = parsed.data;

    let query = supabaseAdmin
      .from('direct_messages')
      .select('id, conversation_id, sender_id, content, read_at, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error: msgError } = await query;

    if (msgError) {
      logger.error('Error fetching DM messages', { detail: msgError.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    const hasMore = (messages?.length ?? 0) > limit;
    const trimmed = (messages ?? []).slice(0, limit);

    void (async () => {
      try {
        await supabaseAdmin
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', session.user.id)
          .is('read_at', null);
      } catch (err) {
        logger.error('Error marking messages as read', {
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    if (trimmed.length === 0) {
      return NextResponse.json({ messages: [], hasMore: false });
    }

    const userIds = [...new Set(trimmed.map((m) => m.sender_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, alias, profile_photo_url')
      .in('id', userIds);

    const userMap = new Map<
      string,
      { name: string | null; alias: string | null; profile_photo_url: string | null }
    >();
    for (const u of users ?? []) {
      userMap.set(u.id, {
        name: u.name,
        alias: u.alias,
        profile_photo_url: u.profile_photo_url,
      });
    }

    const result = trimmed.map((m) => {
      const user = userMap.get(m.sender_id);
      return {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.content,
        read_at: m.read_at,
        created_at: m.created_at,
        sender_name: user?.name ?? null,
        sender_alias: user?.alias ?? null,
        sender_profile_photo_url: user?.profile_photo_url ?? null,
      };
    });

    return NextResponse.json({ messages: result, hasMore });
  } catch (error) {
    logger.error('Error in DM messages GET', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!UUID_REGEX.test(conversationId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const parsed = sendDmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { isParticipant, otherUserId } = await verifyConversationParticipant(
      conversationId,
      session.user.id
    );
    if (!isParticipant || !otherUserId) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversacion' }, { status: 403 });
    }

    const isMutual = await areMutualFollows(session.user.id, otherUserId);
    if (!isMutual) {
      return NextResponse.json(
        { error: 'Ya no puedes enviar mensajes a este usuario' },
        { status: 403 }
      );
    }

    const { data: message, error: insertError } = await supabaseAdmin
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: parsed.data.content,
      })
      .select('id, conversation_id, sender_id, content, read_at, created_at')
      .single();

    if (insertError || !message) {
      logger.error('Error inserting DM', { detail: insertError?.message });
      return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
    }

    const result = {
      ...message,
      sender_name: session.user.name ?? null,
      sender_alias: session.user.alias ?? null,
      sender_profile_photo_url: session.user.profile_photo_url ?? null,
    };

    const senderName = session.user.name ?? session.user.alias ?? 'Alguien';
    const preview =
      parsed.data.content.length > DM_PREVIEW_LENGTH
        ? `${parsed.data.content.slice(0, DM_PREVIEW_LENGTH - 3)}...`
        : parsed.data.content;

    sendPushToUserIfEnabled(
      otherUserId,
      {
        title: `Mensaje de ${senderName}`,
        body: preview,
        tag: `dm-${conversationId}`,
        data: { url: `/messages?chat=${conversationId}`, type: 'dm' },
      },
      'dm'
    ).catch((err) => {
      logger.error('Error sending DM push notification', {
        detail: err instanceof Error ? err.message : String(err),
      });
    });

    return NextResponse.json({ message: result }, { status: 201 });
  } catch (error) {
    logger.error('Error in DM messages POST', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
