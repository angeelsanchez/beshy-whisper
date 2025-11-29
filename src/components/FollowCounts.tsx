'use client';

import { useFollowCounts } from '@/hooks/useFollowCounts';

interface FollowCountsProps {
  userId: string;
  isDay: boolean;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export default function FollowCounts({ userId, isDay, onFollowersClick, onFollowingClick }: FollowCountsProps) {
  const { followersCount, followingCount, loading } = useFollowCounts(userId);

  if (loading) {
    return (
      <div className="flex gap-4 text-sm opacity-50">
        <span>-- Seguidores</span>
        <span>-- Siguiendo</span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 text-sm">
      <button
        onClick={onFollowersClick}
        className={`transition-opacity hover:opacity-70 ${
          isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
        }`}
        aria-label={`${followersCount} seguidores`}
      >
        <span className="font-bold">{followersCount}</span>{' '}
        <span className="opacity-70">Seguidores</span>
      </button>
      <button
        onClick={onFollowingClick}
        className={`transition-opacity hover:opacity-70 ${
          isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
        }`}
        aria-label={`Siguiendo a ${followingCount}`}
      >
        <span className="font-bold">{followingCount}</span>{' '}
        <span className="opacity-70">Siguiendo</span>
      </button>
    </div>
  );
}
