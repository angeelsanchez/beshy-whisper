import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import { startConversationSchema } from '@/lib/schemas/messages';
import { areMutualFollows, getCanonicalPair } from '@/lib/mutual-follow';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 });
    }

    const parsed = startConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { targetUserId } = parsed.data;
    const currentUserId = session.user.id;

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: 'No puedes iniciar una conversacion contigo mismo' },
        { status: 400 }
      );
    }

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const isMutual = await areMutualFollows(currentUserId, targetUserId);
    if (!isMutual) {
      return NextResponse.json(
        { error: 'Solo puedes enviar mensajes a usuarios que te siguen y a quienes sigues' },
        { status: 403 }
      );
    }

    const { userAId, userBId } = getCanonicalPair(currentUserId, targetUserId);

    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('user_a_id', userAId)
      .eq('user_b_id', userBId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversationId: existing.id });
    }

    const { data: newConversation, error: insertError } = await supabaseAdmin
      .from('conversations')
      .insert({ user_a_id: userAId, user_b_id: userBId })
      .select('id')
      .single();

    if (insertError || !newConversation) {
      logger.error('Error creating conversation', { detail: insertError?.message });
      return NextResponse.json({ error: 'Error al crear conversacion' }, { status: 500 });
    }

    return NextResponse.json({ conversationId: newConversation.id }, { status: 201 });
  } catch (error) {
    logger.error('Error in start conversation POST', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
