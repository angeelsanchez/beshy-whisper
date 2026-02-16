'use client';

import type { HabitStatData } from '@/hooks/useHabitStats';
import HabitStats from './HabitStats';
import type { HabitLink } from '@/hooks/useHabitLinks';

interface HabitProgressTabProps {
  readonly stats: HabitStatData[];
  readonly isDay: boolean;
  readonly onHabitsChanged?: () => void;
  readonly activeLinks?: HabitLink[];
  readonly currentUserId?: string;
}

export default function HabitProgressTab({
  stats,
  isDay,
  onHabitsChanged,
  activeLinks = [],
  currentUserId,
}: HabitProgressTabProps): React.ReactElement {
  if (stats.length === 0) {
    const text = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
    return (
      <div className={`text-center py-12 ${text}`}>
        <p className="text-sm">No hay datos de progreso aún</p>
      </div>
    );
  }

  return (
    <HabitStats
      stats={stats}
      isDay={isDay}
      onHabitsChanged={onHabitsChanged}
      activeLinks={activeLinks}
      currentUserId={currentUserId}
    />
  );
}
