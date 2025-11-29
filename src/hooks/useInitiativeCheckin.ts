'use client';

import { useState, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import type { InitiativeCheckinResult } from '@/types/initiative';

interface UseInitiativeCheckinReturn {
  readonly checkin: (
    initiativeId: string,
    value?: number,
    date?: string
  ) => Promise<InitiativeCheckinResult | null>;
  readonly checking: boolean;
}

function formatToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function useInitiativeCheckin(): UseInitiativeCheckinReturn {
  const { session } = useAuthSession();
  const [checking, setChecking] = useState(false);

  const checkin = useCallback(async (
    initiativeId: string,
    value?: number,
    date?: string
  ): Promise<InitiativeCheckinResult | null> => {
    if (!session?.user?.id || checking) return null;

    setChecking(true);

    try {
      const body: Record<string, unknown> = {};
      if (date !== undefined) body.date = date;
      else body.date = formatToday();
      if (value !== undefined) body.value = value;

      const res = await fetch(`/api/initiatives/${initiativeId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) return null;

      const data: InitiativeCheckinResult = await res.json();
      window.dispatchEvent(new Event('initiatives-changed'));
      return data;
    } catch {
      return null;
    } finally {
      setChecking(false);
    }
  }, [session?.user?.id, checking]);

  return { checkin, checking };
}
