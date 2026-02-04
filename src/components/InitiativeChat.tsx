'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useInitiativeChat } from '@/hooks/useInitiativeChat';
import InitiativeChatMessage from '@/components/InitiativeChatMessage';
import InitiativeChatInput from '@/components/InitiativeChatInput';

interface InitiativeChatProps {
  readonly initiativeId: string;
  readonly userId: string;
  readonly isDay: boolean;
}

export default function InitiativeChat({
  initiativeId,
  userId,
  isDay,
}: InitiativeChatProps): React.ReactElement {
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    sending,
    error,
    sendMessage,
    loadMore,
  } = useInitiativeChat(initiativeId, userId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (!loading && messages.length > 0 && prevMessageCountRef.current === 0) {
      requestAnimationFrame(scrollToBottom);
    }
    prevMessageCountRef.current = messages.length;
  }, [loading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (isAtBottomRef.current && messages.length > 0) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages.length, scrollToBottom]);

  const handleScroll = useCallback((): void => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  const handleSend = useCallback(async (content: string): Promise<boolean> => {
    isAtBottomRef.current = true;
    return sendMessage(content);
  }, [sendMessage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)]">
        <div className={`w-6 h-6 border-2 rounded-full animate-spin ${
          isDay ? 'border-[#4A2E1B]/20 border-t-[#4A2E1B]' : 'border-[#F5F0E1]/20 border-t-[#F5F0E1]'
        }`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {error && (
        <div className="px-4 py-2 text-xs text-red-500 text-center">{error}</div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                isDay
                  ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/15'
                  : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/15'
              }`}
            >
              {loadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <span className="text-4xl">💬</span>
            <p className={`text-sm ${
              isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'
            }`}>
              Todavía no hay mensajes
            </p>
            <p className={`text-xs ${
              isDay ? 'text-[#4A2E1B]/30' : 'text-[#F5F0E1]/30'
            }`}>
              Sé el primero en escribir
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showHeader = !prev || prev.user_id !== msg.user_id;

            return (
              <InitiativeChatMessage
                key={msg.id}
                message={msg}
                isOwnMessage={msg.user_id === userId}
                isDay={isDay}
                showHeader={showHeader}
              />
            );
          })
        )}
      </div>

      <InitiativeChatInput
        isDay={isDay}
        sending={sending}
        onSend={handleSend}
      />
    </div>
  );
}
