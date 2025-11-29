'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Challenge } from '@/types/challenge';

interface UseActiveChallengeResult {
  readonly challenge: Challenge | null;
  readonly participantCount: number;
  readonly loading: boolean;
  readonly refetch: () => Promise<void>;
}

export function useActiveChallenge(): UseActiveChallengeResult {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchActiveChallenge = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        setChallenge(null);
        setParticipantCount(0);
        setLoading(false);
        return;
      }

      const activeChallenge = data[0] as Challenge;
      setChallenge(activeChallenge);

      const { count, error: countError } = await supabase
        .from('challenge_entries')
        .select('user_id', { count: 'exact', head: true })
        .eq('challenge_id', activeChallenge.id);

      if (!countError) {
        setParticipantCount(count ?? 0);
      }
    } catch {
      setChallenge(null);
      setParticipantCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveChallenge();
  }, [fetchActiveChallenge]);

  return { challenge, participantCount, loading, refetch: fetchActiveChallenge };
}
