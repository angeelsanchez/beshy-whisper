'use client';

import { HabitStatData } from '@/hooks/useHabitStats';

interface HabitCardProps {
  habit: {
    id: string;
    name: string;
    color: string;
    frequency: 'daily' | 'weekly';
    target_days_per_week: number;
  };
  isCompleted: boolean;
  toggling: boolean;
  stat?: HabitStatData;
  isDay: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export default function HabitCard({
  habit,
  isCompleted,
  toggling,
  stat,
  isDay,
  onToggle,
  onEdit,
}: HabitCardProps) {
  const completionRate = stat?.completionRateWeekly ?? 0;
  const currentStreak = stat?.currentStreak ?? 0;
  const milestone = stat?.milestone;

  const getMilestoneIcon = () => {
    if (milestone === '66_reps') return '★';
    if (milestone === '21_reps') return '◆';
    return null;
  };

  const milestoneIcon = getMilestoneIcon();

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
        isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
      } ${milestone === '66_reps' ? (isDay ? 'ring-1 ring-amber-500/40' : 'ring-1 ring-amber-400/30') : ''}`}
    >
      <button
        onClick={onToggle}
        disabled={toggling}
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          toggling ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'
        } ${
          isCompleted
            ? 'border-transparent'
            : isDay
              ? 'border-[#4A2E1B]/30 hover:border-[#4A2E1B]/60'
              : 'border-[#F5F0E1]/30 hover:border-[#F5F0E1]/60'
        }`}
        style={isCompleted ? { backgroundColor: habit.color } : undefined}
        aria-label={isCompleted ? 'Desmarcar habito' : 'Completar habito'}
      >
        {isCompleted && (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </svg>
        )}
      </button>

      <button
        onClick={onEdit}
        className={`flex-1 min-w-0 text-left ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-medium truncate ${isCompleted ? 'line-through opacity-60' : ''}`}
          >
            {habit.name}
          </span>
          {milestoneIcon && (
            <span className={`text-xs flex-shrink-0 ${milestone === '66_reps' ? 'text-amber-500' : 'text-blue-500'}`}>
              {milestoneIcon}
            </span>
          )}
        </div>
      </button>

      <div className={`flex items-center gap-2 flex-shrink-0 text-xs ${
        isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'
      }`}>
        <span title="Tasa semanal">{completionRate}%</span>
        {currentStreak > 0 && (
          <span title={`Racha: ${currentStreak} dias`} className="tabular-nums">
            {currentStreak}d
          </span>
        )}
      </div>
    </div>
  );
}
