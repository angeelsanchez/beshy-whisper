'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface InitiativeChatInputProps {
  readonly isDay: boolean;
  readonly sending: boolean;
  readonly onSend: (content: string) => Promise<boolean>;
}

export default function InitiativeChatInput({
  isDay,
  sending,
  onSend,
}: InitiativeChatInputProps): React.ReactElement {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !sending;

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleSend = useCallback(async (): Promise<void> => {
    if (!canSend) return;
    const content = value.trim();
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const success = await onSend(content);
    if (!success) {
      setValue(content);
    }
  }, [canSend, value, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className={`flex items-end gap-2 p-3 border-t ${
      isDay ? 'border-[#4A2E1B]/10 bg-[#F5F0E1]' : 'border-[#F5F0E1]/10 bg-[#2D1E1A]'
    }`}>
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          maxLength={500}
          rows={1}
          disabled={sending}
          className={`w-full px-3 py-2 rounded-2xl text-sm resize-none outline-none transition-colors ${
            isDay
              ? 'bg-[#4A2E1B]/5 text-[#4A2E1B] placeholder-[#4A2E1B]/40 focus:bg-[#4A2E1B]/10'
              : 'bg-[#F5F0E1]/5 text-[#F5F0E1] placeholder-[#F5F0E1]/40 focus:bg-[#F5F0E1]/10'
          } ${sending ? 'opacity-50' : ''}`}
        />
        {value.length > 400 && (
          <span className={`absolute right-2 bottom-1 text-[10px] ${
            value.length > 480
              ? 'text-red-500'
              : isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'
          }`}>
            {value.length}/500
          </span>
        )}
      </div>
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Enviar mensaje"
        className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all ${
          canSend
            ? isDay
              ? 'bg-[#4A2E1B] text-[#F5F0E1] active:scale-95'
              : 'bg-[#F5F0E1] text-[#2D1E1A] active:scale-95'
            : isDay
              ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/30'
              : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/30'
        }`}
      >
        {sending ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
