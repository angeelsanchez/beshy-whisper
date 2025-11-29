'use client';

interface InitiativeCommunityStreakProps {
  readonly streak: number;
  readonly isDay: boolean;
}

function getFireDisplay(streak: number): { fires: string; sizeClass: string } {
  if (streak >= 14) return { fires: '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25', sizeClass: 'text-xl' };
  if (streak >= 7) return { fires: '\uD83D\uDD25\uD83D\uDD25', sizeClass: 'text-lg' };
  return { fires: '\uD83D\uDD25', sizeClass: 'text-base' };
}

export default function InitiativeCommunityStreak({
  streak,
  isDay,
}: InitiativeCommunityStreakProps): React.ReactElement | null {
  if (streak <= 0) return null;

  const { fires, sizeClass } = getFireDisplay(streak);
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
  const bgColor = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bgColor}`}
      role="status"
      aria-label={`Racha comunitaria de ${streak} días`}
    >
      <span className={sizeClass} aria-hidden="true">{fires}</span>
      <div className="flex flex-col">
        <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
          {streak} {streak === 1 ? 'día' : 'días'}
        </span>
        <span className={`text-[11px] ${subtextColor}`}>
          Racha comunitaria
        </span>
      </div>
    </div>
  );
}
