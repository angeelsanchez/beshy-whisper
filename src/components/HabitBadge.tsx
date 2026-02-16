'use client';

import { Award, Crown } from 'lucide-react';

interface HabitBadgeProps {
  readonly type: 'building' | 'identity';
  readonly isDay: boolean;
  readonly size?: 'sm' | 'md';
}

export default function HabitBadge({ type, isDay, size = 'md' }: HabitBadgeProps): React.ReactElement {
  const isBuildingBadge = type === 'building';

  const sizeClasses = size === 'sm'
    ? 'w-6 h-6'
    : 'w-8 h-8';

  const bgColor = isBuildingBadge
    ? isDay ? 'bg-blue-500/20 text-blue-600' : 'bg-blue-400/20 text-blue-300'
    : isDay ? 'bg-amber-500/20 text-amber-600' : 'bg-amber-400/20 text-amber-300';

  const title = isBuildingBadge
    ? 'Insignia en Construcción - 21 días con 80% completado'
    : 'Insignia de Identidad - 90 días con 90% completado';

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center ${bgColor} flex-shrink-0`}
      title={title}
    >
      {isBuildingBadge ? (
        <Award className="w-4 h-4" strokeWidth={2} />
      ) : (
        <Crown className="w-4 h-4" strokeWidth={2} />
      )}
    </div>
  );
}
