'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useHabits } from '@/hooks/useHabits';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import { useHabitStats } from '@/hooks/useHabitStats';
import { useTimer } from '@/hooks/useTimer';
import HabitList from '@/components/HabitList';
import HabitCalendar from '@/components/HabitCalendar';
import HabitStats from '@/components/HabitStats';

function formatToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function HabitsPage(): React.ReactElement | null {
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuthSession();
  const { isDay } = useTheme();
  const { habits, loading: habitsLoading } = useHabits();
  const habitIds = useMemo(() => habits.map(h => h.id), [habits]);
  const { isCompleted, getValue, toggleLog, incrementLog, toggling } = useHabitLogs(habitIds, getCurrentMonth());
  const { stats, refetch: refetchStats } = useHabitStats();
  const { activeTimer, elapsedSeconds, start: startTimer, stop: stopTimer, cancel: cancelTimer } = useTimer();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const today = formatToday();

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const handleToggle = useCallback(async (habitId: string) => {
    const result = await toggleLog(habitId);
    if (result?.milestone) {
      showToastMessage(result.milestone.message);
    }
    refetchStats();
  }, [toggleLog, refetchStats, showToastMessage]);

  const handleIncrement = useCallback(async (habitId: string, amount: number) => {
    const result = await incrementLog(habitId, amount);
    if (result?.milestone) {
      showToastMessage(result.milestone.message);
    }
    refetchStats();
  }, [incrementLog, refetchStats, showToastMessage]);

  const handleTimerStart = useCallback((habitId: string) => {
    startTimer(habitId);
  }, [startTimer]);

  const handleTimerStop = useCallback(async () => {
    const timerHabitId = activeTimer?.habitId;
    if (!timerHabitId) {
      cancelTimer();
      return;
    }

    const elapsedMinutes = stopTimer();
    if (elapsedMinutes <= 0) return;

    const result = await incrementLog(timerHabitId, elapsedMinutes);
    if (result?.milestone) {
      showToastMessage(result.milestone.message);
    }
    refetchStats();
  }, [activeTimer, stopTimer, cancelTimer, incrementLog, refetchStats, showToastMessage]);

  const calendarCompletions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const stat of stats) {
      for (const date of Object.keys(stat.completionsByDate)) {
        map[date] = (map[date] ?? 0) + 1;
      }
    }
    return map;
  }, [stats]);

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
      }`}>
        <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
          Cargando...
        </p>
      </div>
    );
  }

  if (!session) {
    router.replace('/login');
    return null;
  }

  return (
    <div className={`min-h-screen pb-24 lg:pb-8 lg:pl-20 ${
      isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
    }`}>
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <h1 className={`text-xl font-bold ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
          Hábitos
        </h1>

        {habitsLoading ? (
          <div className={`text-center py-12 text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            Cargando hábitos...
          </div>
        ) : (
          <>
            <HabitList
              habits={habits}
              isDay={isDay}
              isCompleted={isCompleted}
              getValue={getValue}
              toggling={toggling}
              stats={stats}
              today={today}
              activeTimerHabitId={activeTimer?.habitId ?? null}
              elapsedSeconds={elapsedSeconds}
              onToggle={handleToggle}
              onIncrement={handleIncrement}
              onTimerStart={handleTimerStart}
              onTimerStop={handleTimerStop}
              onEdit={(habitId) => router.push(`/habits/edit/${habitId}`)}
              onAdd={() => router.push('/habits/new')}
            />

            {habits.length > 0 && (
              <>
                <HabitCalendar
                  completionsByDate={calendarCompletions}
                  totalHabits={habits.length}
                  isDay={isDay}
                />
                <HabitStats stats={stats} isDay={isDay} />
              </>
            )}
          </>
        )}
      </div>

      {showToast && (
        <div
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          className="fixed left-1/2 transform -translate-x-1/2 bg-[#4A2E1B] text-[#F5F0E1] px-6 py-3 rounded-lg shadow-lg opacity-90 z-[70]"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
