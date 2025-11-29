'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Loader2 } from 'lucide-react';

interface StartDmButtonProps {
  readonly targetUserId: string;
  readonly isDay: boolean;
  readonly className?: string;
}

export default function StartDmButton({
  targetUserId,
  isDay,
  className = '',
}: StartDmButtonProps): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      router.push(`/messages?chat=${data.conversationId}`);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, router]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        isDay
          ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20 active:scale-95'
          : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20 active:scale-95'
      } ${loading ? 'opacity-50' : ''} ${className}`}
      aria-label="Enviar mensaje"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" strokeWidth={2} />
      )}
      <span>Enviar mensaje</span>
    </button>
  );
}
