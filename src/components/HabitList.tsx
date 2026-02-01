'use client';

import { useState } from 'react';
import HabitCard from './HabitCard';
import { HabitStatData } from '@/hooks/useHabitStats';

interface Habit {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly color: string;
  readonly target_days: number[];
}

interface HabitListProps {
  readonly habits: Habit[];
  readonly isDay: boolean;
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly toggling: boolean;
  readonly stats: HabitStatData[];
  readonly today: string;
  readonly onToggle: (habitId: string) => void;
  readonly onEdit: (habitId: string) => void;
  readonly onAdd: () => void;
}

export default function HabitList({
  habits,
  isDay,
  isCompleted,
  toggling,
  stats,
  today,
  onToggle,
  onEdit,
  onAdd,
}: HabitListProps) {
  const [showOtherDays, setShowOtherDays] = useState(false);
  const currentDayOfWeek = new Date().getDay();

  const todayHabits = habits.filter(h =>
    Array.isArray(h.target_days) ? h.target_days.includes(currentDayOfWeek) : true
  );
  const otherHabits = habits.filter(h =>
    Array.isArray(h.target_days) ? !h.target_days.includes(currentDayOfWeek) : false
  );

  const completedCount = todayHabits.filter(h => isCompleted(h.id, today)).length;
  const totalTodayCount = todayHabits.length;

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
        <button
          onClick={onAdd}
          className={`w-full py-8 text-center text-sm rounded-lg border-2 border-dashed transition-colors ${
            isDay
              ? 'border-[#4A2E1B]/20 text-[#4A2E1B]/50 hover:border-[#4A2E1B]/40 hover:text-[#4A2E1B]/70'
              : 'border-[#F5F0E1]/20 text-[#F5F0E1]/50 hover:border-[#F5F0E1]/40 hover:text-[#F5F0E1]/70'
          }`}
        >
          Crea tu primer hábito
        </button>
      ) : (
        <>
          {totalTodayCount === 0 ? (
            <p className={`text-center text-sm py-4 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
              No hay hábitos programados para hoy
            </p>
          ) : (
            <div className="space-y-2">
              {todayHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isCompleted={isCompleted(habit.id, today)}
                  toggling={toggling}
                  stat={stats.find(s => s.habitId === habit.id)}
                  isDay={isDay}
                  isDueToday
                  onToggle={() => onToggle(habit.id)}
                  onEdit={() => onEdit(habit.id)}
                />
              ))}
            </div>
          )}

          {otherHabits.length > 0 && (
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
                Otros días ({otherHabits.length})
              </button>

              {showOtherDays && (
                <div className="space-y-2 mt-2">
                  {otherHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isCompleted={isCompleted(habit.id, today)}
                      toggling={toggling}
                      stat={stats.find(s => s.habitId === habit.id)}
                      isDay={isDay}
                      isDueToday={false}
                      onToggle={() => onToggle(habit.id)}
                      onEdit={() => onEdit(habit.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {totalTodayCount > 0 && completedCount === totalTodayCount && (
        <p className={`text-center text-sm mt-3 font-medium ${isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'}`}>
          Todos los hábitos de hoy completados
        </p>
      )}
    </div>
  );
}
