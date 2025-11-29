'use client';

import type { InitiativeDailyProgress } from '@/types/initiative';

interface InitiativeWeeklyGridProps {
  readonly weekly: ReadonlyArray<InitiativeDailyProgress>;
  readonly isDay: boolean;
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const dayIndex = d.getDay();
  const mapped = dayIndex === 0 ? 6 : dayIndex - 1;
  return DAY_LABELS[mapped] ?? '';
}

function getCircleColor(rate: number): string {
  if (rate >= 100) return 'bg-amber-400';
  if (rate >= 80) return 'bg-green-500/60';
  if (rate >= 50) return 'bg-amber-500/50';
  if (rate > 0) return 'bg-red-500/30';
  return '';
}

function isToday(dateStr: string): boolean {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

export default function InitiativeWeeklyGrid({
  weekly,
  isDay,
}: InitiativeWeeklyGridProps): React.ReactElement {
  const last7 = weekly.slice(-7);
  const labelColor = isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40';
  const rateColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const emptyBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const todayRing = isDay ? 'ring-2 ring-[#4A2E1B]/30' : 'ring-2 ring-[#F5F0E1]/30';

  return (
    <div className="flex justify-between gap-1" role="group" aria-label="Progreso semanal">
      {last7.map(day => {
        const circleColor = getCircleColor(day.completion_rate);
        const today = isToday(day.date);

        return (
          <div key={day.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className={`text-[10px] font-medium ${labelColor}`}>
              {getDayLabel(day.date)}
            </span>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                circleColor || emptyBg
              } ${today ? todayRing : ''}`}
              aria-label={`${day.date}: ${day.completion_rate}%`}
            />
            <span className={`text-[9px] tabular-nums ${rateColor}`}>
              {day.completion_rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
