'use client';

import { useState, useMemo } from 'react';
import HabitCard from './HabitCard';
import { HabitStatData } from '@/hooks/useHabitStats';
import { isDueToday as checkDueToday, getWeekCompletionCount } from '@/utils/habit-helpers';
import type { FrequencyMode } from '@/utils/habit-helpers';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly color: string;
  readonly frequency_mode: FrequencyMode;
  readonly target_days: number[];
  readonly weekly_target: number | null;
  readonly tracking_type: 'binary' | 'quantity' | 'timer';
  readonly target_value: number | null;
  readonly unit: string | null;
  readonly icon: string | null;
}

interface HabitListProps {
  readonly habits: Habit[];
  readonly isDay: boolean;
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly getValue: (habitId: string, date: string) => number;
  readonly toggling: boolean;
  readonly stats: HabitStatData[];
  readonly today: string;
  readonly activeTimerHabitId: string | null;
  readonly elapsedSeconds: number;
  readonly onToggle: (habitId: string) => void;
  readonly onIncrement: (habitId: string, amount: number) => void;
  readonly onTimerStart: (habitId: string) => void;
  readonly onTimerStop: () => void;
  readonly onEdit: (habitId: string) => void;
  readonly onAdd: () => void;
  readonly completedDatesMap?: ReadonlyMap<string, ReadonlySet<string>>;
  readonly linkedHabitIds?: ReadonlySet<string>;
}

function EmptyState({ isDay, onAdd }: { readonly isDay: boolean; readonly onAdd: () => void }): React.ReactElement {
  return (
    <div className={`text-center py-6 px-4 rounded-xl border-2 border-dashed ${
      isDay
        ? 'border-[#4A2E1B]/15 bg-[#4A2E1B]/[0.02]'
        : 'border-[#F5F0E1]/15 bg-[#F5F0E1]/[0.02]'
    }`}>
      <p className={`text-sm font-medium mb-1 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Lleva el control de tus hábitos diarios
      </p>
      <p className={`text-xs mb-4 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
        Elige los días, marca tu progreso y construye rachas
      </p>
      <button
        onClick={onAdd}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isDay
            ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] active:scale-95'
            : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E8E0D0] active:scale-95'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        Crear mi primer hábito
      </button>
    </div>
  );
}

function HabitCardList({
  habits,
  isCompleted,
  getValue,
  toggling,
  stats,
  isDay,
  isDueToday,
  today,
  activeTimerHabitId,
  elapsedSeconds,
  completedDatesMap,
  linkedHabitIds,
  onToggle,
  onIncrement,
  onTimerStart,
  onTimerStop,
  onEdit,
}: {
  readonly habits: Habit[];
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly getValue: (habitId: string, date: string) => number;
  readonly toggling: boolean;
  readonly stats: HabitStatData[];
  readonly isDay: boolean;
  readonly isDueToday: boolean;
  readonly today: string;
  readonly activeTimerHabitId: string | null;
  readonly elapsedSeconds: number;
  readonly completedDatesMap?: ReadonlyMap<string, ReadonlySet<string>>;
  readonly linkedHabitIds?: ReadonlySet<string>;
  readonly onToggle: (habitId: string) => void;
  readonly onIncrement: (habitId: string, amount: number) => void;
  readonly onTimerStart: (habitId: string) => void;
  readonly onTimerStop: () => void;
  readonly onEdit: (habitId: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      {habits.map(habit => {
        const weekCount = habit.frequency_mode === 'weekly_count'
          ? getWeekCompletionCount(completedDatesMap?.get(habit.id) ?? new Set<string>())
          : undefined;
        return (
          <HabitCard
            key={habit.id}
            habit={habit}
            isCompleted={isCompleted(habit.id, today)}
            currentValue={getValue(habit.id, today)}
            toggling={toggling}
            stat={stats.find(s => s.habitId === habit.id)}
            isDay={isDay}
            isDueToday={isDueToday}
            isTimerRunning={activeTimerHabitId === habit.id}
            elapsedSeconds={activeTimerHabitId === habit.id ? elapsedSeconds : 0}
            weekCompletionCount={weekCount}
            hasActiveLink={linkedHabitIds?.has(habit.id) ?? false}
            onToggle={() => onToggle(habit.id)}
            onIncrement={(amount) => onIncrement(habit.id, amount)}
            onTimerStart={() => onTimerStart(habit.id)}
            onTimerStop={onTimerStop}
            onEdit={() => onEdit(habit.id)}
          />
        );
      })}
    </div>
  );
}

function OtherDaysSection({
  habits,
  isCompleted,
  getValue,
  toggling,
  stats,
  isDay,
  today,
  activeTimerHabitId,
  elapsedSeconds,
  completedDatesMap,
  linkedHabitIds,
  onToggle,
  onIncrement,
  onTimerStart,
  onTimerStop,
  onEdit,
}: {
  readonly habits: Habit[];
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly getValue: (habitId: string, date: string) => number;
  readonly toggling: boolean;
  readonly stats: HabitStatData[];
  readonly isDay: boolean;
  readonly today: string;
  readonly activeTimerHabitId: string | null;
  readonly elapsedSeconds: number;
  readonly completedDatesMap?: ReadonlyMap<string, ReadonlySet<string>>;
  readonly linkedHabitIds?: ReadonlySet<string>;
  readonly onToggle: (habitId: string) => void;
  readonly onIncrement: (habitId: string, amount: number) => void;
  readonly onTimerStart: (habitId: string) => void;
  readonly onTimerStop: () => void;
  readonly onEdit: (habitId: string) => void;
}): React.ReactElement | null {
  const [showOtherDays, setShowOtherDays] = useState(false);

  if (habits.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setShowOtherDays(prev => !prev)}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
          isDay ? 'text-[#4A2E1B]/50 hover:text-[#4A2E1B]/70' : 'text-[#F5F0E1]/50 hover:text-[#F5F0E1]/70'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          fill="currentColor"
          viewBox="0 0 16 16"
          className={`transition-transform ${showOtherDays ? 'rotate-90' : ''}`}
        >
          <path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
        </svg>
        Otros días ({habits.length})
      </button>

      {showOtherDays && (
        <div className="mt-2">
          <HabitCardList
            habits={habits}
            isCompleted={isCompleted}
            getValue={getValue}
            toggling={toggling}
            stats={stats}
            isDay={isDay}
            isDueToday={false}
            today={today}
            activeTimerHabitId={activeTimerHabitId}
            elapsedSeconds={elapsedSeconds}
            completedDatesMap={completedDatesMap}
            linkedHabitIds={linkedHabitIds}
            onToggle={onToggle}
            onIncrement={onIncrement}
            onTimerStart={onTimerStart}
            onTimerStop={onTimerStop}
            onEdit={onEdit}
          />
        </div>
      )}
    </div>
  );
}

function CompletedBanner({ isDay }: { readonly isDay: boolean }): React.ReactElement {
  return (
    <div className={`text-center mt-3 py-2 px-3 rounded-lg ${
      isDay ? 'bg-green-600/10' : 'bg-green-400/10'
    }`}>
      <p className={`text-sm font-medium ${isDay ? 'text-green-700' : 'text-green-400'}`}>
        Día completado
      </p>
    </div>
  );
}

export default function HabitList({
  habits,
  isDay,
  isCompleted,
  getValue,
  toggling,
  stats,
  today,
  activeTimerHabitId,
  elapsedSeconds,
  onToggle,
  onIncrement,
  onTimerStart,
  onTimerStop,
  onEdit,
  onAdd,
  completedDatesMap,
  linkedHabitIds,
}: HabitListProps): React.ReactElement {
  const now = useMemo(() => new Date(), []);

  const todayHabits = useMemo(() => habits.filter(h => {
    const dates = completedDatesMap?.get(h.id) ?? new Set<string>();
    return checkDueToday(h.frequency_mode, h.target_days, h.weekly_target, dates, now);
  }), [habits, completedDatesMap, now]);

  const otherHabits = useMemo(() => habits.filter(h => {
    const dates = completedDatesMap?.get(h.id) ?? new Set<string>();
    return !checkDueToday(h.frequency_mode, h.target_days, h.weekly_target, dates, now);
  }), [habits, completedDatesMap, now]);

  const completedCount = todayHabits.filter(h => isCompleted(h.id, today)).length;
  const totalTodayCount = todayHabits.length;
  const allCompleted = totalTodayCount > 0 && completedCount === totalTodayCount;

  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className={`text-base font-bold ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Hoy
          </h2>
          {totalTodayCount > 0 && (
            <p className={`text-xs mt-0.5 ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
              {completedCount}/{totalTodayCount} completados
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className={`p-2 rounded-lg transition-colors ${
            isDay
              ? 'hover:bg-[#4A2E1B]/10 text-[#4A2E1B]'
              : 'hover:bg-[#F5F0E1]/10 text-[#F5F0E1]'
          }`}
          aria-label="Nuevo hábito"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState isDay={isDay} onAdd={onAdd} />
      ) : (
        <>
          {totalTodayCount === 0 ? (
            <p className={`text-center text-sm py-4 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
              No hay hábitos programados para hoy
            </p>
          ) : (
            <HabitCardList
              habits={todayHabits}
              isCompleted={isCompleted}
              getValue={getValue}
              toggling={toggling}
              stats={stats}
              isDay={isDay}
              isDueToday
              today={today}
              activeTimerHabitId={activeTimerHabitId}
              elapsedSeconds={elapsedSeconds}
              completedDatesMap={completedDatesMap}
              linkedHabitIds={linkedHabitIds}
              onToggle={onToggle}
              onIncrement={onIncrement}
              onTimerStart={onTimerStart}
              onTimerStop={onTimerStop}
              onEdit={onEdit}
            />
          )}

          <OtherDaysSection
            habits={otherHabits}
            isCompleted={isCompleted}
            getValue={getValue}
            toggling={toggling}
            stats={stats}
            isDay={isDay}
            today={today}
            activeTimerHabitId={activeTimerHabitId}
            elapsedSeconds={elapsedSeconds}
            completedDatesMap={completedDatesMap}
            linkedHabitIds={linkedHabitIds}
            onToggle={onToggle}
            onIncrement={onIncrement}
            onTimerStart={onTimerStart}
            onTimerStop={onTimerStop}
            onEdit={onEdit}
          />
        </>
      )}

      {allCompleted && <CompletedBanner isDay={isDay} />}
    </div>
  );
}
