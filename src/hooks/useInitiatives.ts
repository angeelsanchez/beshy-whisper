'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import type { InitiativeListItem } from '@/types/initiative';

interface UseInitiativesReturn {
  readonly joinedInitiatives: ReadonlyArray<InitiativeListItem>;
  readonly availableInitiatives: ReadonlyArray<InitiativeListItem>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
  readonly join: (initiativeId: string) => Promise<boolean>;
  readonly leave: (initiativeId: string) => Promise<boolean>;
}

export function useInitiatives(): UseInitiativesReturn {
  const { session } = useAuthSession();
  const [initiatives, setInitiatives] = useState<InitiativeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInitiatives = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/initiatives?limit=50');
      if (!res.ok) {
        setError('Error al cargar iniciativas');
        setLoading(false);
        return;
      }

      const data: { initiatives: InitiativeListItem[] } = await res.json();
      setInitiatives(data.initiatives);
      setError(null);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  useEffect(() => {
    function handleRefresh(): void {
      fetchInitiatives();
    }

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('initiatives-changed', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('initiatives-changed', handleRefresh);
    };
  }, [fetchInitiatives]);

  const joinedInitiatives = useMemo(
    () => initiatives.filter(i => i.is_joined),
    [initiatives]
  );

  const availableInitiatives = useMemo(
    () => initiatives.filter(i => !i.is_joined),
    [initiatives]
  );

  const join = useCallback(async (initiativeId: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const res = await fetch(`/api/initiatives/${initiativeId}/join`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errData: { error?: string } = await res.json();
        setError(errData.error ?? 'Error al unirse');
        return false;
      }

      setInitiatives(prev =>
        prev.map(i =>
          i.id === initiativeId
            ? { ...i, is_joined: true, participant_count: i.participant_count + 1 }
            : i
        )
      );
      setError(null);
      window.dispatchEvent(new Event('initiatives-changed'));
      return true;
    } catch {
      setError('Error de conexión');
      return false;
    }
  }, [session?.user?.id]);

  const leave = useCallback(async (initiativeId: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    const previousInitiatives = initiatives;
    setInitiatives(prev =>
      prev.map(i =>
        i.id === initiativeId
          ? { ...i, is_joined: false, participant_count: Math.max(0, i.participant_count - 1) }
          : i
      )
    );

    try {
      const res = await fetch(`/api/initiatives/${initiativeId}/leave`, {
        method: 'POST',
      });

      if (!res.ok) {
        setInitiatives(previousInitiatives);
        const errData: { error?: string } = await res.json();
        setError(errData.error ?? 'Error al salir');
        return false;
      }

      setError(null);
      window.dispatchEvent(new Event('initiatives-changed'));
      return true;
    } catch {
      setInitiatives(previousInitiatives);
      setError('Error de conexión');
      return false;
    }
  }, [session?.user?.id, initiatives]);

  return {
    joinedInitiatives,
    availableInitiatives,
    loading,
    error,
    refetch: fetchInitiatives,
    join,
    leave,
  };
}
