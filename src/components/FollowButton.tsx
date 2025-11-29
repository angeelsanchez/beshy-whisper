'use client';

import { useFollowStatus } from '@/hooks/useFollowStatus';

interface FollowButtonProps {
  targetUserId: string;
  isDay: boolean;
  compact?: boolean;
}

export default function FollowButton({ targetUserId, isDay, compact = false }: FollowButtonProps) {
  const { isFollowing, loading, toggling, toggleFollow, isSelf } = useFollowStatus(targetUserId);

  if (isSelf || loading) return null;

  return (
    <button
      onClick={toggleFollow}
      disabled={toggling}
      className={`font-medium rounded-full transition-all duration-300 ${
        compact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
      } ${
        toggling ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.97]'
      } ${
        isFollowing
          ? isDay
            ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] border border-[#4A2E1B]/30'
            : 'bg-[#F5F0E1]/10 text-[#F5F0E1] border border-[#F5F0E1]/30'
          : isDay
            ? 'bg-[#4A2E1B] text-[#F5F0E1]'
            : 'bg-[#F5F0E1] text-[#2D1E1A]'
      }`}
      aria-label={isFollowing ? 'Dejar de seguir' : 'Seguir'}
    >
      {toggling ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
    </button>
  );
}
