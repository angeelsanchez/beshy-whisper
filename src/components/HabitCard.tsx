'use client';

import { HabitStatData } from '@/hooks/useHabitStats';

interface HabitCardProps {
  readonly habit: {
    readonly id: string;
    readonly name: string;
    readonly color: string;
    readonly target_days: number[];
    readonly tracking_type: 'binary' | 'quantity';
    readonly target_value: number | null;
    readonly unit: string | null;
    readonly icon: string | null;
  };
  readonly isCompleted: boolean;
  readonly currentValue: number;
  readonly toggling: boolean;
  readonly stat?: HabitStatData;
  readonly isDay: boolean;
  readonly isDueToday?: boolean;
  readonly onToggle: () => void;
  readonly onIncrement: (amount: number) => void;
  readonly onEdit: () => void;
}

function getConsistencyStyle(
  completionRate: number,
  totalReps: number,
  isDay: boolean,
): { borderClass: string; opacityClass: string } {
  if (totalReps === 0) return { borderClass: '', opacityClass: '' };

  if (completionRate >= 80) {
    return {
      borderClass: isDay ? 'border-l-4 border-l-green-600/40' : 'border-l-4 border-l-green-400/40',
      opacityClass: '',
    };
  }

  if (completionRate < 50) {
    return {
      borderClass: isDay ? 'border-l-4 border-l-amber-500/40' : 'border-l-4 border-l-amber-400/40',
      opacityClass: 'opacity-75',
    };
  }

  return { borderClass: '', opacityClass: '' };
}

function getMilestoneIcon(milestone: string | null): string | null {
  if (milestone === '66_reps') return '★';
  if (milestone === '21_reps') return '◆';
  return null;
}

function BinaryToggle({
  isCompleted,
  toggling,
  color,
  isDay,
  onToggle,
}: {
  readonly isCompleted: boolean;
  readonly toggling: boolean;
  readonly color: string;
  readonly isDay: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  const uncheckedBorder = isDay
    ? 'border-[#4A2E1B]/30 hover:border-[#4A2E1B]/60'
    : 'border-[#F5F0E1]/30 hover:border-[#F5F0E1]/60';
  const borderCls = isCompleted ? 'border-transparent' : uncheckedBorder;

  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
        toggling ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'
      } ${borderCls}`}
      style={isCompleted ? { backgroundColor: color } : undefined}
      aria-label={isCompleted ? 'Desmarcar hábito' : 'Completar hábito'}
    >
      {isCompleted && (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="white" viewBox="0 0 16 16">
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      )}
    </button>
  );
}

function QuantityControls({
  currentValue,
  targetValue,
  unit,
  color,
  toggling,
  isDay,
  onIncrement,
}: {
  readonly currentValue: number;
  readonly targetValue: number;
  readonly unit: string;
  readonly color: string;
  readonly toggling: boolean;
  readonly isDay: boolean;
  readonly onIncrement: (amount: number) => void;
}): React.ReactElement {
  const progressPct = Math.min((currentValue / Math.max(targetValue, 1)) * 100, 100);

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${
          isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
        }`}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: color }}
          />
        </div>
        <span className={`text-[10px] tabular-nums flex-shrink-0 ${
          isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'
        }`}>
          {currentValue}/{targetValue} {unit}
        </span>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onIncrement(-1)}
          disabled={toggling || currentValue <= 0}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
            toggling || currentValue <= 0
              ? 'opacity-30 cursor-not-allowed'
              : 'active:scale-90'
          } ${isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'}`}
          aria-label="Decrementar"
        >
          −
        </button>
        <button
          onClick={() => onIncrement(1)}
          disabled={toggling}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
            toggling ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'
          } ${isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'}`}
          aria-label="Incrementar"
        >
          +
        </button>
      </div>
    </div>
  );
}

function StatsDisplay({
  completionRate,
  currentStreak,
  isDay,
}: {
  readonly completionRate: number;
  readonly currentStreak: number;
  readonly isDay: boolean;
}): React.ReactElement {
  return (
    <div className={`flex items-center gap-2.5 flex-shrink-0 text-[11px] tabular-nums ${
      isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'
    }`}>
      <span>{completionRate}%</span>
      {currentStreak > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="text-orange-400 text-xs">🔥</span>
          {currentStreak}
        </span>
      )}
    </div>
  );
}

export default function HabitCard({
  habit,
  isCompleted,
  currentValue,
  toggling,
  stat,
  isDay,
  isDueToday = true,
  onToggle,
  onIncrement,
  onEdit,
}: HabitCardProps): React.ReactElement {
  const completionRate = stat?.completionRateWeekly ?? 0;
  const currentStreak = stat?.currentStreak ?? 0;
  const totalReps = stat?.totalRepetitions ?? 0;
  const milestone = stat?.milestone ?? null;
  const milestoneIcon = getMilestoneIcon(milestone);
  const { borderClass, opacityClass } = getConsistencyStyle(completionRate, totalReps, isDay);
  const isQuantity = habit.tracking_type === 'quantity';

  return (
    <div
      className={`p-3 rounded-xl transition-all duration-200 ${
        isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
      } ${borderClass} ${opacityClass} ${
        !isDueToday ? 'opacity-50' : ''
      } ${milestone === '66_reps' ? (isDay ? 'ring-1 ring-amber-500/40' : 'ring-1 ring-amber-400/30') : ''}`}
    >
      <div className="flex items-center gap-3">
        {isQuantity ? (
          <span className="text-lg flex-shrink-0 w-7 text-center">{habit.icon ?? '📊'}</span>
        ) : (
          <BinaryToggle
            isCompleted={isCompleted}
            toggling={toggling}
            color={habit.color}
            isDay={isDay}
            onToggle={onToggle}
          />
        )}

        <button
          onClick={onEdit}
          className={`flex-1 min-w-0 text-left ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
        >
          <div className="flex items-center gap-1.5">
            {!isQuantity && habit.icon && (
              <span className="text-sm flex-shrink-0">{habit.icon}</span>
            )}
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

        <StatsDisplay
          completionRate={completionRate}
          currentStreak={currentStreak}
          isDay={isDay}
        />
      </div>

      {isQuantity && habit.target_value !== null && habit.unit !== null && (
        <div className="ml-10">
          <QuantityControls
            currentValue={currentValue}
            targetValue={habit.target_value}
            unit={habit.unit}
            color={habit.color}
            toggling={toggling}
            isDay={isDay}
            onIncrement={onIncrement}
          />
        </div>
      )}
    </div>
  );
}
