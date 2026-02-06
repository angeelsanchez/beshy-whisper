'use client';

import { useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import DmMessage from '@/components/DmMessage';
import DmChatInput from '@/components/DmChatInput';
import { useDmChat } from '@/hooks/useDmChat';
import type { ConversationParticipant } from '@/types/dm';

interface DmConversationProps {
  readonly conversationId: string;
  readonly otherUser: ConversationParticipant;
  readonly userId: string;
  readonly userName: string | null;
  readonly userAlias: string | null;
  readonly userPhotoUrl: string | null;
  readonly isDay: boolean;
  readonly onBack: () => void;
}

export default function DmConversation({
  conversationId,
  otherUser,
  userId,
  userName,
  userAlias,
  userPhotoUrl,
  isDay,
  onBack,
}: DmConversationProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { messages, loading, loadingMore, hasMore, sending, error, sendMessage, loadMore } =
    useDmChat(
      conversationId,
      userId,
      { name: userName, alias: userAlias, profilePhotoUrl: userPhotoUrl },
      otherUser
    );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, messages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || loadingMore || !hasMore) return;

    if (container.scrollTop < 100) {
      loadMore();
    }
  }, [loadingMore, hasMore, loadMore]);

  const displayName = otherUser.name ?? otherUser.alias ?? 'Usuario';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header
        className={`shrink-0 flex items-center gap-3 px-4 pb-2 border-b ${
          isDay ? 'border-[#4A2E1B]/10 bg-[#F5F0E1]' : 'border-[#F5F0E1]/10 bg-[#2D1E1A]'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          onClick={onBack}
          aria-label="Volver"
          className={`p-1 -ml-1 rounded-lg transition-colors ${
            isDay ? 'hover:bg-[#4A2E1B]/10' : 'hover:bg-[#F5F0E1]/10'
          }`}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <Avatar src={otherUser.profile_photo_url} name={displayName} size="sm" />
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium truncate ${
              isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
            }`}
          >
            {displayName}
          </p>
          <p
            className={`text-xs truncate ${
              isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'
            }`}
          >
            @{otherUser.alias}
          </p>
        </div>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col ${
          isDay ? 'bg-[#F5F0E1]/50' : 'bg-[#2D1E1A]/50'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center flex-1">
            <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
              {error}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <Avatar src={otherUser.profile_photo_url} name={displayName} size="lg" />
            <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
              Inicia la conversacion con {displayName}
            </p>
          </div>
        ) : (
          <div className="mt-auto">
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              return (
                <DmMessage
                  key={msg.id}
                  message={msg}
                  isOwnMessage={msg.sender_id === userId}
                  isDay={isDay}
                  showHeader={showHeader}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <DmChatInput isDay={isDay} sending={sending} onSend={sendMessage} />
    </div>
  );
}
