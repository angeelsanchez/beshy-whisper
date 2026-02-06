'use client';

import Avatar from '@/components/Avatar';
import type { DirectMessage } from '@/types/dm';

interface DmMessageProps {
  readonly message: DirectMessage;
  readonly isOwnMessage: boolean;
  readonly isDay: boolean;
  readonly showHeader: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (isToday) return time;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${time}`;
}

export default function DmMessage({
  message,
  isOwnMessage,
  isDay,
  showHeader,
}: DmMessageProps): React.ReactElement {
  const displayName = message.sender_name ?? message.sender_alias ?? 'Usuario';
  const isTemp = message.id.startsWith('temp-');

  if (isOwnMessage) {
    return (
      <div className={`flex justify-end ${showHeader ? 'mt-3' : 'mt-0.5'}`}>
        <div className="max-w-[80%] w-fit">
          <div
            className={`px-3 py-2 rounded-2xl rounded-br-md ${
              isDay
                ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                : 'bg-[#F5F0E1]/20 text-[#F5F0E1]'
            } ${isTemp ? 'opacity-60' : ''}`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <p
            className={`text-[10px] text-right mt-0.5 ${
              isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'
            }`}
          >
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${showHeader ? 'mt-3' : 'mt-0.5'}`}>
      <div className="shrink-0 w-7">
        {showHeader && (
          <Avatar
            src={message.sender_profile_photo_url}
            name={displayName}
            size="sm"
          />
        )}
      </div>
      <div className="max-w-[80%]">
        {showHeader && (
          <p
            className={`text-xs font-medium mb-0.5 ${
              isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'
            }`}
          >
            {displayName}
          </p>
        )}
        <div
          className={`w-fit px-3 py-2 rounded-2xl rounded-bl-md ${
            isDay
              ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
              : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p
          className={`text-[10px] mt-0.5 ${
            isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
