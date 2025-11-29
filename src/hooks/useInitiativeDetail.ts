'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import type {
  Initiative,
  InitiativeProgress,
  InitiativeParticipant,
} from '@/types/initiative';

interface InitiativeDetailData {
  readonly initiative: Initiative;
  readonly is_joined: boolean;
  readonly user_checked_in_today: boolean;
  readonly user_today_value: number | null;
}

interface UseInitiativeDetailReturn {
  readonly initiative: Initiative | null;
  readonly progress: InitiativeProgress | null;
  readonly participants: ReadonlyArray<InitiativeParticipant>;
  readonly isJoined: boolean;
  readonly userCheckedInToday: boolean;
  readonly userTodayValue: number | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
}

export function useInitiativeDetail(initiativeId: string | null): UseInitiativeDetailReturn {
  const { session } = useAuthSession();
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [progress, setProgress] = useState<InitiativeProgress | null>(null);
  const [participants, setParticipants] = useState<InitiativeParticipant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [userCheckedInToday, setUserCheckedInToday] = useState(false);
  const [userTodayValue, setUserTodayValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!session?.user?.id || !initiativeId) {
      setLoading(false);
      return;
    }

    try {
      const [detailRes, progressRes, participantsRes] = await Promise.all([
        fetch(`/api/initiatives/${initiativeId}`),
        fetch(`/api/initiatives/${initiativeId}/progress?days=7`),
        fetch(`/api/initiatives/${initiativeId}/participants`),
      ]);

      if (!detailRes.ok) {
        setError('Iniciativa no encontrada');
        setLoading(false);
        return;
      }

      const detailData: InitiativeDetailData = await detailRes.json();
      setInitiative(detailData.initiative);
      setIsJoined(detailData.is_joined);
      setUserCheckedInToday(detailData.user_checked_in_today);
      setUserTodayValue(detailData.user_today_value);

      if (progressRes.ok) {
        const progressData: InitiativeProgress = await progressRes.json();
        setProgress(progressData);
      }

      if (participantsRes.ok) {
        const participantsData: { participants: InitiativeParticipant[] } = await participantsRes.json();
        setParticipants(participantsData.participants);
      }

      setError(null);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, initiativeId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    function handleRefresh(): void {
      fetchDetail();
    }

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('initiatives-changed', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('initiatives-changed', handleRefresh);
    };
  }, [fetchDetail]);

  return {
    initiative,
    progress,
    participants,
    isJoined,
    userCheckedInToday,
    userTodayValue,
    loading,
    error,
    refetch: fetchDetail,
  };
}
