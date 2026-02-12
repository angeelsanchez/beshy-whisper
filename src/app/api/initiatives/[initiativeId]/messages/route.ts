import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { sendMessageSchema, messagesQuerySchema } from '@/lib/schemas/initiative-chat';
import { sendPushToUserIfEnabled } from '@/lib/push-notify';
import { UUID_REGEX } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ initiativeId: string }>;
}

async function verifyParticipant(initiativeId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('initiative_participants')
    .select('id')
    .eq('initiative_id', initiativeId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return data !== null;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const isParticipant = await verifyParticipant(initiativeId, session.user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'No eres participante' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = messagesQuerySchema.safeParse({
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cursor, limit } = parsed.data;

    let query = supabaseAdmin
      .from('initiative_messages')
      .select('id, initiative_id, user_id, content, created_at')
      .eq('initiative_id', initiativeId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error: msgError } = await query;

    if (msgError) {
      logger.error('Error fetching messages', { detail: msgError.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    const hasMore = (messages?.length ?? 0) > limit;
    const trimmed = (messages ?? []).slice(0, limit);

    if (trimmed.length === 0) {
      return NextResponse.json({ messages: [], hasMore: false });
    }

    const userIds = [...new Set(trimmed.map(m => m.user_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, alias, profile_photo_url')
      .in('id', userIds);

    const userMap = new Map<string, { name: string | null; alias: string | null; profile_photo_url: string | null }>();
    for (const u of users ?? []) {
      userMap.set(u.id, { name: u.name, alias: u.alias, profile_photo_url: u.profile_photo_url });
    }

    const result = trimmed.map(m => {
      const user = userMap.get(m.user_id);
      return {
        id: m.id,
        initiative_id: m.initiative_id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        user_name: user?.name ?? null,
        user_alias: user?.alias ?? null,
        user_profile_photo_url: user?.profile_photo_url ?? null,
      };
    });

    return NextResponse.json({ messages: result, hasMore });
  } catch (error) {
    logger.error('Error in messages GET', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { initiativeId } = await params;
    if (!UUID_REGEX.test(initiativeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const isParticipant = await verifyParticipant(initiativeId, session.user.id);
    if (!isParticipant) {
      return NextResponse.json({ error: 'No eres participante' }, { status: 403 });
    }

    const { data: initiative } = await supabaseAdmin
      .from('initiatives')
      .select('id, name, icon')
      .eq('id', initiativeId)
      .eq('is_active', true)
      .maybeSingle();

    if (!initiative) {
      return NextResponse.json({ error: 'Iniciativa no encontrada' }, { status: 404 });
    }

    const { data: message, error: insertError } = await supabaseAdmin
      .from('initiative_messages')
      .insert({
        initiative_id: initiativeId,
        user_id: session.user.id,
        content: parsed.data.content,
      })
      .select('id, initiative_id, user_id, content, created_at')
      .single();

    if (insertError || !message) {
      logger.error('Error inserting message', { detail: insertError?.message });
      return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
    }

    const result = {
      ...message,
      user_name: session.user.name ?? null,
      user_alias: session.user.alias ?? null,
      user_profile_photo_url: session.user.profile_photo_url ?? null,
    };

    sendNotificationsToParticipants(
      initiativeId,
      session.user.id,
      session.user.name ?? session.user.alias ?? 'Alguien',
      parsed.data.content,
      initiative.name,
      initiative.icon
    ).catch(err => {
      logger.error('Error sending chat notifications', { detail: err instanceof Error ? err.message : String(err) });
    });

    return NextResponse.json({ message: result }, { status: 201 });
  } catch (error) {
    logger.error('Error in messages POST', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function sendNotificationsToParticipants(
  initiativeId: string,
  senderId: string,
  senderName: string,
  content: string,
  initiativeName: string,
  initiativeIcon: string | null
): Promise<void> {
  const { data: participants } = await supabaseAdmin
    .from('initiative_participants')
    .select('user_id')
    .eq('initiative_id', initiativeId)
    .eq('is_active', true)
    .neq('user_id', senderId);

  if (!participants || participants.length === 0) return;

  const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

  const preview = content.length > 60 ? `${content.slice(0, 57)}...` : content;
  const title = `${initiativeIcon ?? '💬'} ${initiativeName}`;

  for (const p of participants) {
    const { data: recentMsg } = await supabaseAdmin
      .from('initiative_messages')
      .select('id')
      .eq('initiative_id', initiativeId)
      .eq('user_id', p.user_id)
      .gte('created_at', thirtySecondsAgo)
      .limit(1);

    if (recentMsg && recentMsg.length > 0) continue;

    await sendPushToUserIfEnabled(p.user_id, {
      title,
      body: `${senderName}: ${preview}`,
      tag: `chat-${initiativeId}`,
      data: { url: `/initiatives/${initiativeId}`, type: 'chat' },
    }, 'chat');
  }
}
