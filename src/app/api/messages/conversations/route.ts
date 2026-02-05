import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { logger } from '@/lib/logger';
import type { ConversationListItem } from '@/types/dm';

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: conversations, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('id, user_a_id, user_b_id, last_message_at')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (convError) {
      logger.error('Error fetching conversations', { detail: convError.message, userId });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    logger.info('Conversations fetched', { userId, count: conversations?.length ?? 0 });

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [], totalUnread: 0 });
    }

    const otherUserIds = conversations.map((c) =>
      c.user_a_id === userId ? c.user_b_id : c.user_a_id
    );
    const conversationIds = conversations.map((c) => c.id);

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, alias, profile_photo_url')
      .in('id', otherUserIds);

    const userMap = new Map<
      string,
      { name: string | null; alias: string; profile_photo_url: string | null }
    >();
    for (const u of users ?? []) {
      userMap.set(u.id, {
        name: u.name,
        alias: u.alias,
        profile_photo_url: u.profile_photo_url,
      });
    }

    const { data: lastMessages } = await supabaseAdmin
      .from('direct_messages')
      .select('conversation_id, content, sender_id, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    const lastMessageMap = new Map<
      string,
      { content: string; sender_id: string; created_at: string }
    >();
    for (const m of lastMessages ?? []) {
      if (!lastMessageMap.has(m.conversation_id)) {
        lastMessageMap.set(m.conversation_id, {
          content: m.content,
          sender_id: m.sender_id,
          created_at: m.created_at,
        });
      }
    }

    const { data: unreadMessages } = await supabaseAdmin
      .from('direct_messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    const unreadMap = new Map<string, number>();
    for (const m of unreadMessages ?? []) {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
    }

    let totalUnread = 0;
    const result: ConversationListItem[] = conversations.map((c) => {
      const otherUserId = c.user_a_id === userId ? c.user_b_id : c.user_a_id;
      const otherUser = userMap.get(otherUserId);
      const lastMessage = lastMessageMap.get(c.id);
      const unreadCount = unreadMap.get(c.id) ?? 0;
      totalUnread += unreadCount;

      return {
        id: c.id,
        otherUser: {
          id: otherUserId,
          name: otherUser?.name ?? null,
          alias: otherUser?.alias ?? 'Usuario',
          profilePhotoUrl: otherUser?.profile_photo_url ?? null,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.sender_id,
              createdAt: lastMessage.created_at,
            }
          : null,
        unreadCount,
        lastMessageAt: c.last_message_at,
      };
    });

    return NextResponse.json({ conversations: result, totalUnread });
  } catch (error) {
    logger.error('Error in conversations GET', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
