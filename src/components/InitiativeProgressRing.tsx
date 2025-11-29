'use client';

import { useMemo } from 'react';

interface InitiativeProgressRingProps {
  readonly completedCount: number;
  readonly totalParticipants: number;
  readonly color: string;
  readonly icon?: string | null;
  readonly size?: number;
  readonly isDay: boolean;
}

function getProgressColor(rate: number, baseColor: string): string {
  if (rate >= 100) return '#F59E0B';
  if (rate >= 67) return baseColor;
  if (rate >= 34) return `${baseColor}B3`;
  return `${baseColor}66`;
}

export default function InitiativeProgressRing({
  completedCount,
  totalParticipants,
  color,
  icon,
  size = 160,
  isDay,
}: InitiativeProgressRingProps): React.ReactElement {
  const rate = totalParticipants > 0
    ? Math.round((completedCount / totalParticipants) * 100)
    : 0;

  const { radius, circumference, strokeDashoffset, strokeWidth } = useMemo(() => {
    const sw = size * 0.06;
    const r = (size - sw * 2) / 2;
    const c = 2 * Math.PI * r;
    const clampedRate = Math.min(Math.max(rate, 0), 100);
    const offset = c * (1 - clampedRate / 100);
    return { radius: r, circumference: c, strokeDashoffset: offset, strokeWidth: sw };
  }, [size, rate]);

  const progressColor = getProgressColor(rate, color);
  const isPerfect = rate >= 100 && totalParticipants > 0;
  const center = size / 2;
  const trackColor = isDay ? 'rgba(74, 46, 27, 0.1)' : 'rgba(245, 240, 225, 0.1)';
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';

  return (
    <div
      className={`relative flex items-center justify-center ${isPerfect ? 'animate-pulse' : ''}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={rate}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso comunitario: ${completedCount} de ${totalParticipants} (${rate}%)`}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="flex flex-col items-center justify-center z-10 gap-0.5">
        {icon && (
          <span className="text-2xl" aria-hidden="true">{icon}</span>
        )}
        <span
          className="font-bold tabular-nums"
          style={{ color: textColor, fontSize: size * 0.15 }}
        >
          {completedCount}/{totalParticipants}
        </span>
        <span
          className="font-medium tabular-nums"
          style={{ color: `${textColor}80`, fontSize: size * 0.09 }}
        >
          {rate}%
        </span>
      </div>
    </div>
  );
}
