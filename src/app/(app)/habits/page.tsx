'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useHabits, type Habit } from '@/hooks/useHabits';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import { useHabitStats, type HabitStatData } from '@/hooks/useHabitStats';
import { useTimer } from '@/hooks/useTimer';
import { useHabitLinks, type HabitLink } from '@/hooks/useHabitLinks';
import CommunityTab from '@/components/CommunityTab';
import HabitTrackerTab from '@/components/HabitTrackerTab';
import HabitProgressTab from '@/components/HabitProgressTab';

type Tab = 'tracker' | 'progress' | 'community';

function formatToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface TabContentProps {
  readonly activeTab: Tab;
  readonly isDay: boolean;
  readonly habitsLoading: boolean;
  readonly habits: Habit[];
  readonly stats: HabitStatData[];
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly getValue: (habitId: string, date: string) => number;
  readonly toggling: boolean;
  readonly today: string;
  readonly activeTimerHabitId: string | null;
  readonly elapsedSeconds: number;
  readonly onToggle: (habitId: string, date?: string) => void;
  readonly onIncrement: (habitId: string, amount: number, date?: string) => void;
  readonly onTimerStart: (habitId: string) => void;
  readonly onTimerStop: () => void;
  readonly onEdit: (habitId: string) => void;
  readonly onAdd: () => void;
  readonly onHabitsChanged: () => void;
  readonly activeLinks: HabitLink[];
  readonly currentUserId: string;
  readonly completedMap: ReadonlyMap<string, ReadonlySet<string>>;
}

function renderTabContent({
  activeTab,
  isDay,
  habitsLoading,
  habits,
  stats,
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
  onHabitsChanged,
  activeLinks,
  currentUserId,
  completedMap,
}: TabContentProps): React.ReactElement {
  if (activeTab === 'tracker') {
    if (habitsLoading) {
      return (
        <div className={`text-center py-12 text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
          Cargando hábitos...
        </div>
      );
    }
    return (
      <HabitTrackerTab
        habits={habits}
        isDay={isDay}
        isCompleted={isCompleted}
        getValue={getValue}
        toggling={toggling}
        today={today}
        activeTimerHabitId={activeTimerHabitId}
        elapsedSeconds={elapsedSeconds}
        completedMap={completedMap}
        onToggle={onToggle}
        onIncrement={onIncrement}
        onTimerStart={onTimerStart}
        onTimerStop={onTimerStop}
        onEdit={onEdit}
        onAdd={onAdd}
      />
    );
  }

  if (activeTab === 'progress') {
    return (
      <HabitProgressTab
        stats={stats}
        isDay={isDay}
        onHabitsChanged={onHabitsChanged}
        activeLinks={activeLinks}
        currentUserId={currentUserId}
      />
    );
  }

  return <CommunityTab isDay={isDay} />;
}

export default function HabitsPage(): React.ReactElement | null {
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuthSession();
  const { isDay } = useTheme();
  const { habits, loading: habitsLoading } = useHabits();
  const habitIds = useMemo(() => habits.map(h => h.id), [habits]);
  const { isCompleted, getValue, toggleLog, incrementLog, toggling, completedMap } = useHabitLogs(habitIds, getCurrentMonth());
  const { stats, refetch: refetchStats } = useHabitStats();
  const { activeTimer, elapsedSeconds, start: startTimer, stop: stopTimer, cancel: cancelTimer } = useTimer();
  const { activeLinks } = useHabitLinks();

  const [activeTab, setActiveTab] = useState<Tab>('tracker');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const today = formatToday();

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const handleToggle = useCallback(async (habitId: string, date?: string) => {
    const result = await toggleLog(habitId, date);
    if (result?.milestone) {
      showToastMessage(result.milestone.message);
    }
    refetchStats();
  }, [toggleLog, refetchStats, showToastMessage]);

  const handleIncrement = useCallback(async (habitId: string, amount: number, date?: string) => {
    const result = await incrementLog(habitId, amount, date);
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

  const tabActiveClass = isDay
    ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
    : 'bg-[#F5F0E1]/10 text-[#F5F0E1]';
  const tabInactiveClass = isDay
    ? 'text-[#4A2E1B]/50'
    : 'text-[#F5F0E1]/50';

  return (
    <div className={`min-h-screen pb-24 lg:pb-8 lg:pl-20 ${
      isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
    }`}>
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-bold ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Hábitos
          </h1>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-black/5" role="tablist" aria-label="Secciones de hábitos">
          <button
            role="tab"
            aria-selected={activeTab === 'tracker'}
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tracker' ? tabActiveClass : tabInactiveClass
            }`}
          >
            Tracker
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'progress'}
            onClick={() => setActiveTab('progress')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'progress' ? tabActiveClass : tabInactiveClass
            }`}
          >
            Progreso
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'community'}
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'community' ? tabActiveClass : tabInactiveClass
            }`}
          >
            Comunidad
          </button>
        </div>

        {renderTabContent({
          activeTab,
          isDay,
          habitsLoading,
          habits,
          stats,
          isCompleted,
          getValue,
          toggling,
          today,
          activeTimerHabitId: activeTimer?.habitId ?? null,
          elapsedSeconds,
          onToggle: handleToggle,
          onIncrement: handleIncrement,
          onTimerStart: handleTimerStart,
          onTimerStop: handleTimerStop,
          onEdit: (habitId) => router.push(`/habits/edit/${habitId}`),
          onAdd: () => router.push('/habits/new'),
          onHabitsChanged: refetchStats,
          activeLinks,
          currentUserId: session.user.id,
          completedMap,
        })}
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
