'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

export interface Manifestation {
  id: string;
  content: string;
  status: 'active' | 'fulfilled' | 'archived';
  createdAt: string;
  updatedAt: string;
  fulfilledAt: string | null;
  daysManifesting: number;
  reaffirmationCount: number;
  reaffirmedToday: boolean;
}

export interface FulfilledManifestation {
  id: string;
  content: string;
  status: 'fulfilled';
  createdAt: string;
  fulfilledAt: string;
  daysManifesting: number;
  reaffirmationCount: number;
}

export function useManifestations() {
  const { session } = useAuthSession();
  const [manifestations, setManifestations] = useState<Manifestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManifestations = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/manifestations');
      if (!res.ok) {
        setError('Error al cargar manifestaciones');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setManifestations(data.manifestations);
      setError(null);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchManifestations();
  }, [fetchManifestations]);

  useEffect(() => {
    function handleRefresh(): void {
      fetchManifestations();
    }

    window.addEventListener('manifestations-changed', handleRefresh);
    return () => {
      window.removeEventListener('manifestations-changed', handleRefresh);
    };
  }, [fetchManifestations]);

  const createManifestation = useCallback(
    async (content: string): Promise<Manifestation | null> => {
      if (!session?.user?.id) return null;

      try {
        const res = await fetch('/api/manifestations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al crear manifestación');
          return null;
        }

        const result = await res.json();
        setManifestations((prev) => [result.manifestation, ...prev]);
        setError(null);
        window.dispatchEvent(new Event('manifestations-changed'));
        return result.manifestation;
      } catch {
        setError('Error de conexión');
        return null;
      }
    },
    [session?.user?.id]
  );

  const reaffirmManifestations = useCallback(
    async (ids: string[], entryId?: string): Promise<boolean> => {
      if (!session?.user?.id || ids.length === 0) return false;

      try {
        const res = await fetch('/api/manifestations/reaffirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestationIds: ids, entryId }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al reafirmar');
          return false;
        }

        setManifestations((prev) =>
          prev.map((m) => (ids.includes(m.id) ? { ...m, reaffirmedToday: true } : m))
        );
        setError(null);
        return true;
      } catch {
        setError('Error de conexión');
        return false;
      }
    },
    [session?.user?.id]
  );

  const fulfillManifestation = useCallback(
    async (id: string): Promise<FulfilledManifestation | null> => {
      if (!session?.user?.id) return null;

      try {
        const res = await fetch('/api/manifestations/fulfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifestationId: id }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al marcar como cumplida');
          return null;
        }

        const result = await res.json();
        setManifestations((prev) => prev.filter((m) => m.id !== id));
        setError(null);
        window.dispatchEvent(new Event('manifestations-changed'));
        return result.manifestation;
      } catch {
        setError('Error de conexión');
        return null;
      }
    },
    [session?.user?.id]
  );

  const deleteManifestation = useCallback(
    async (id: string): Promise<boolean> => {
      if (!session?.user?.id) return false;

      try {
        const res = await fetch(`/api/manifestations/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || 'Error al eliminar manifestación');
          return false;
        }

        setManifestations((prev) => prev.filter((m) => m.id !== id));
        setError(null);
        window.dispatchEvent(new Event('manifestations-changed'));
        return true;
      } catch {
        setError('Error de conexión');
        return false;
      }
    },
    [session?.user?.id]
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchManifestations();
  }, [fetchManifestations]);

  return {
    manifestations,
    loading,
    error,
    createManifestation,
    reaffirmManifestations,
    fulfillManifestation,
    deleteManifestation,
    refetch,
  };
}
