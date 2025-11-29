'use client';

import { Loader2, MessageCircle } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { ConversationListItem } from '@/types/dm';

interface DmInboxProps {
  readonly conversations: ReadonlyArray<ConversationListItem>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly isDay: boolean;
  readonly onSelectConversation: (conversation: ConversationListItem) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function DmInbox({
  conversations,
  loading,
  error,
  isDay,
  onSelectConversation,
}: DmInboxProps): React.ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
          {error}
        </p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
          }`}
        >
          <MessageCircle
            className={`w-8 h-8 ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`}
            strokeWidth={1.5}
          />
        </div>
        <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
          No tienes conversaciones
        </p>
        <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`}>
          Envia un mensaje a alguien que sigas y te siga
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-current/10">
      {conversations.map((conv) => {
        const displayName = conv.otherUser.name ?? conv.otherUser.alias ?? 'Usuario';
        const preview = conv.lastMessage?.content ?? 'Sin mensajes';
        const hasUnread = conv.unreadCount > 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
              isDay ? 'hover:bg-[#4A2E1B]/5' : 'hover:bg-[#F5F0E1]/5'
            }`}
          >
            <div className="relative shrink-0">
              <Avatar
                src={conv.otherUser.profilePhotoUrl}
                name={displayName}
                size="md"
              />
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`font-medium truncate ${
                    hasUnread
                      ? isDay
                        ? 'text-[#4A2E1B]'
                        : 'text-[#F5F0E1]'
                      : isDay
                        ? 'text-[#4A2E1B]/80'
                        : 'text-[#F5F0E1]/80'
                  }`}
                >
                  {displayName}
                </p>
                <span
                  className={`text-xs shrink-0 ${
                    isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'
                  }`}
                >
                  {formatRelativeTime(conv.lastMessageAt)}
                </span>
              </div>
              <p
                className={`text-sm truncate ${
                  hasUnread
                    ? isDay
                      ? 'text-[#4A2E1B]/80 font-medium'
                      : 'text-[#F5F0E1]/80 font-medium'
                    : isDay
                      ? 'text-[#4A2E1B]/50'
                      : 'text-[#F5F0E1]/50'
                }`}
              >
                {conv.lastMessage?.senderId === conv.otherUser.id ? '' : 'Tu: '}
                {preview}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
