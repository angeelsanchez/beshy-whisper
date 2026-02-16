import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface Badge {
  id: string;
  habitId: string;
  habitName: string;
  type: 'building' | 'identity';
  earnedAt: string;
}

interface BadgeProgress {
  daysRequired: number;
  daysCompleted: number;
  completionRequired: number;
  completionCurrent: number;
  isEarned: boolean;
}

export function useHabitBadges(habitId: string) {
  const [buildingProgress, setBuildingProgress] = useState<BadgeProgress | null>(null);
  const [identityProgress, setIdentityProgress] = useState<BadgeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/habits/${habitId}/badge-progress`);
      if (!response.ok) {
        throw new Error('Failed to fetch badge progress');
      }

      const data = await response.json();
      setBuildingProgress(data.building);
      setIdentityProgress(data.identity);
    } catch (error) {
      logger.error('Error fetching badge progress', { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    buildingProgress,
    identityProgress,
    loading,
    refetch: fetchProgress,
  };
}

export function useAllBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    try {
      const response = await fetch('/api/habits/badges');
      if (!response.ok) {
        throw new Error('Failed to fetch badges');
      }

      const data = await response.json();
      setBadges(data.badges || []);
    } catch (error) {
      logger.error('Error fetching badges', { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return {
    badges,
    loading,
    refetch: fetchBadges,
  };
}
