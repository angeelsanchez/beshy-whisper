'use client';

import HabitCard from './HabitCard';
import { HabitStatData } from '@/hooks/useHabitStats';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  color: string;
  frequency: 'daily' | 'weekly';
  target_days_per_week: number;
}

interface HabitListProps {
  habits: Habit[];
  isDay: boolean;
  isCompleted: (habitId: string, date: string) => boolean;
  toggling: boolean;
  stats: HabitStatData[];
  today: string;
  onToggle: (habitId: string) => void;
  onEdit: (habitId: string) => void;
  onAdd: () => void;
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
  const completedCount = habits.filter(h => isCompleted(h.id, today)).length;
  const totalCount = habits.length;

  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className={`text-base font-bold ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Hoy
          </h2>
          {totalCount > 0 && (
            <p className={`text-xs mt-0.5 ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
              {completedCount}/{totalCount} completados
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
          aria-label="Nuevo habito"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        </button>
      </div>

      {totalCount === 0 ? (
        <button
          onClick={onAdd}
          className={`w-full py-8 text-center text-sm rounded-lg border-2 border-dashed transition-colors ${
            isDay
              ? 'border-[#4A2E1B]/20 text-[#4A2E1B]/50 hover:border-[#4A2E1B]/40 hover:text-[#4A2E1B]/70'
              : 'border-[#F5F0E1]/20 text-[#F5F0E1]/50 hover:border-[#F5F0E1]/40 hover:text-[#F5F0E1]/70'
          }`}
        >
          Crea tu primer habito
        </button>
      ) : (
        <div className="space-y-2">
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompleted={isCompleted(habit.id, today)}
              toggling={toggling}
              stat={stats.find(s => s.habitId === habit.id)}
              isDay={isDay}
              onToggle={() => onToggle(habit.id)}
              onEdit={() => onEdit(habit.id)}
            />
          ))}
        </div>
      )}

      {totalCount > 0 && completedCount === totalCount && (
        <p className={`text-center text-sm mt-3 font-medium ${isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'}`}>
          Todos los habitos completados hoy
        </p>
      )}
    </div>
  );
}
