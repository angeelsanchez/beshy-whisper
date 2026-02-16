'use client';

import { useState, useCallback } from 'react';
import type { Habit } from '@/hooks/useHabits';
import HabitCard from './HabitCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HabitTrackerTabProps {
  readonly habits: Habit[];
  readonly isDay: boolean;
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly getValue: (habitId: string, date: string) => number;
  readonly toggling: boolean;
  readonly today: string;
  readonly activeTimerHabitId: string | null;
  readonly elapsedSeconds: number;
  readonly onToggle: (habitId: string) => void;
  readonly onIncrement: (habitId: string, amount: number) => void;
  readonly onTimerStart: (habitId: string) => void;
  readonly onTimerStop: () => void;
  readonly onEdit: (habitId: string) => void;
  readonly onAdd: () => void;
}

export default function HabitTrackerTab({
  habits,
  isDay,
  isCompleted,
  getValue,
  toggling,
  today,
  activeTimerHabitId,
  elapsedSeconds,
  onToggle,
  onIncrement,
  onTimerStart,
  onTimerStop,
  onEdit,
  onAdd,
}: HabitTrackerTabProps): React.ReactElement {
  const [displayDate, setDisplayDate] = useState(today);
  const [viewMode, setViewMode] = useState<'all' | 'today'>('all');

  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevDay = useCallback(() => {
    const date = parseDate(displayDate);
    date.setDate(date.getDate() - 1);
    setDisplayDate(formatDate(date));
  }, [displayDate]);

  const handleNextDay = useCallback(() => {
    const date = parseDate(displayDate);
    date.setDate(date.getDate() + 1);
    if (formatDate(date) <= today) {
      setDisplayDate(formatDate(date));
    }
  }, [displayDate, today]);

  const dailyHabits = habits.filter((_) => _.frequency === 'daily');
  const weeklyHabits = habits.filter((_) => _.frequency === 'weekly');

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const textMuted = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
  const bg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const activeBgColor = isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrevDay}
          className={`p-2 rounded-lg ${isDay ? 'hover:bg-[#4A2E1B]/10' : 'hover:bg-[#F5F0E1]/10'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center flex-1">
          <p className={`text-sm font-medium ${text}`}>
            {new Date(displayDate).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <button
          onClick={handleNextDay}
          disabled={displayDate >= today}
          className={`p-2 rounded-lg ${displayDate >= today ? 'opacity-50 cursor-not-allowed' : isDay ? 'hover:bg-[#4A2E1B]/10' : 'hover:bg-[#F5F0E1]/10'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('all')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'all' ? activeBgColor : bg
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setViewMode('today')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'today' ? activeBgColor : bg
          }`}
        >
          Hoy
        </button>
      </div>

      {dailyHabits.length > 0 && (
        <div className="space-y-2">
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>
            Hábitos diarios
          </h3>
          <div className="space-y-2">
            {dailyHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={isCompleted(habit.id, displayDate)}
                currentValue={getValue(habit.id, displayDate)}
                isDay={isDay}
                toggling={toggling}
                isTimerRunning={activeTimerHabitId === habit.id}
                elapsedSeconds={elapsedSeconds}
                onToggle={() => onToggle(habit.id)}
                onIncrement={amount => onIncrement(habit.id, amount)}
                onTimerStart={() => onTimerStart(habit.id)}
                onTimerStop={onTimerStop}
                onEdit={() => onEdit(habit.id)}
              />
            ))}
          </div>
        </div>
      )}

      {weeklyHabits.length > 0 && (
        <div className="space-y-2">
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${textMuted}`}>
            Hábitos semanales
          </h3>
          <div className="space-y-2">
            {weeklyHabits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCompleted={isCompleted(habit.id, displayDate)}
                currentValue={getValue(habit.id, displayDate)}
                isDay={isDay}
                toggling={toggling}
                isTimerRunning={activeTimerHabitId === habit.id}
                elapsedSeconds={elapsedSeconds}
                onToggle={() => onToggle(habit.id)}
                onIncrement={amount => onIncrement(habit.id, amount)}
                onTimerStart={() => onTimerStart(habit.id)}
                onTimerStop={onTimerStop}
                onEdit={() => onEdit(habit.id)}
              />
            ))}
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <button
          onClick={onAdd}
          className={`w-full py-8 rounded-lg border-2 border-dashed ${
            isDay
              ? 'border-[#4A2E1B]/30 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/5'
              : 'border-[#F5F0E1]/30 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/5'
          } transition-all`}
        >
          <p className="text-sm font-medium">+ Crear primer hábito</p>
        </button>
      )}
    </div>
  );
}
