'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useConversations } from '@/hooks/useConversations';
import DmInbox from '@/components/DmInbox';
import DmConversation from '@/components/DmConversation';
import type { ConversationListItem, ConversationParticipant } from '@/types/dm';

export default function MessagesPage(): React.ReactElement {
  const { session, status } = useAuthSession();
  const { isDay } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  const chatId = searchParams.get('chat');
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(
    null
  );
  const fetchedChatIdRef = useRef<string | null>(null);

  const { conversations, loading, error, totalUnread, refresh } = useConversations(
    session?.user?.id
  );

  useEffect(() => {
    if (!chatId || !session?.user?.id) {
      fetchedChatIdRef.current = null;
      return;
    }

    const conv = conversations.find((c) => c.id === chatId);
    if (conv) {
      setSelectedConversation(conv);
      fetchedChatIdRef.current = chatId;
      return;
    }

    if (fetchedChatIdRef.current === chatId) return;
    fetchedChatIdRef.current = chatId;

    const fetchConversation = async () => {
      try {
        const res = await fetch('/api/messages/conversations');
        if (!res.ok) return;
        const data = await res.json();
        const convs: ConversationListItem[] = data.conversations ?? [];
        const found = convs.find((c) => c.id === chatId);
        if (found) {
          setSelectedConversation(found);
          refresh();
        }
      } catch {
        // Ignore fetch errors
      }
    };

    fetchConversation();
  }, [chatId, conversations, session?.user?.id, refresh]);

  const handleSelectConversation = useCallback(
    (conversation: ConversationListItem) => {
      setSelectedConversation(conversation);
      router.push(`/messages?chat=${conversation.id}`, { scroll: false });
    },
    [router]
  );

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
    router.push('/messages', { scroll: false });
    refresh();
  }, [router, refresh]);

  if (status === 'loading') {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
        }`}
      >
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-4 px-4 ${
          isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
        }`}
      >
        <MessageCircle className="w-12 h-12 opacity-40" strokeWidth={1.5} />
        <p className="text-center">Inicia sesion para ver tus mensajes</p>
      </div>
    );
  }

  const userId = session.user.id;
  const userName = session.user.name ?? null;
  const userAlias = session.user.alias ?? null;
  const userPhotoUrl = session.user.profile_photo_url ?? null;

  if (selectedConversation) {
    const otherUser: ConversationParticipant = {
      id: selectedConversation.otherUser.id,
      name: selectedConversation.otherUser.name,
      alias: selectedConversation.otherUser.alias,
      profile_photo_url: selectedConversation.otherUser.profilePhotoUrl,
    };

    return (
      <div
        className={`chat-fullscreen flex flex-col overflow-hidden ${
          isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
        }`}
      >
        <DmConversation
          conversationId={selectedConversation.id}
          otherUser={otherUser}
          userId={userId}
          userName={userName}
          userAlias={userAlias}
          userPhotoUrl={userPhotoUrl}
          isDay={isDay}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pb-24 lg:pb-8 lg:pl-24 ${
        isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
      }`}
    >
      <header
        className={`sticky top-0 z-10 px-4 pb-3 border-b ${
          isDay ? 'border-[#4A2E1B]/10 bg-[#F5F0E1]' : 'border-[#F5F0E1]/10 bg-[#2D1E1A]'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <h1 className="text-xl font-semibold">Mensajes</h1>
        {totalUnread > 0 && (
          <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            {totalUnread} {totalUnread === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}
          </p>
        )}
      </header>

      <DmInbox
        conversations={conversations}
        loading={loading}
        error={error}
        isDay={isDay}
        onSelectConversation={handleSelectConversation}
      />
    </div>
  );
}
