'use client';

import { useState, useMemo } from 'react';
import { getQuoteOfTheDay } from '@/data/quotes';

interface DailyQuoteProps {
  readonly isDay: boolean;
}

function getTodayKey(): string {
  const now = new Date();
  return `quote-dismissed-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function DailyQuote({ isDay }: DailyQuoteProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(getTodayKey()) === 'true';
  });

  const quote = useMemo(() => getQuoteOfTheDay(), []);

  const handleDismiss = (): void => {
    setDismissed(true);
    sessionStorage.setItem(getTodayKey(), 'true');
  };

  if (dismissed) return null;

  return (
    <div className={`mb-6 p-4 rounded-xl relative transition-all duration-300 ${
      isDay
        ? 'bg-[#4A2E1B]/5 border border-[#4A2E1B]/10'
        : 'bg-[#F5F0E1]/5 border border-[#F5F0E1]/10'
    }`}>
      <button
        type="button"
        onClick={handleDismiss}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-opacity opacity-40 hover:opacity-80 min-w-[44px] min-h-[44px] flex items-center justify-center`}
        aria-label="Cerrar frase del día"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>

      <div className="pr-8">
        <p className="text-sm italic leading-relaxed mb-2">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-xs opacity-60">
          — {quote.author}
        </p>
      </div>
    </div>
  );
}
