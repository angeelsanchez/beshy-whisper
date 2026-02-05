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
import HabitList from '@/components/HabitList';
import HabitCalendar from '@/components/HabitCalendar';
import HabitStats from '@/components/HabitStats';
import CommunityTab from '@/components/CommunityTab';
import HabitLinkPendingList from '@/components/HabitLinkPendingList';

type Tab = 'habits' | 'community';

function formatToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface HabitsTabContentProps {
  readonly habits: Habit[];
  readonly habitsLoading: boolean;
  readonly isDay: boolean;
  readonly isCompleted: (habitId: string, date: string) => boolean;
  readonly getValue: (habitId: string, date: string) => number;
  readonly toggling: boolean;
  readonly stats: HabitStatData[];
  readonly today: string;
  readonly activeTimerHabitId: string | null;
  readonly elapsedSeconds: number;
  readonly completedMap: ReadonlyMap<string, ReadonlySet<string>>;
  readonly linkedHabitIds: ReadonlySet<string>;
  readonly calendarCompletions: Record<string, number>;
  readonly activeLinks: HabitLink[];
  readonly currentUserId: string;
  readonly pendingReceived: HabitLink[];
  readonly pendingSent: HabitLink[];
  readonly onToggle: (habitId: string) => void;
  readonly onIncrement: (habitId: string, amount: number) => void;
  readonly onTimerStart: (habitId: string) => void;
  readonly onTimerStop: () => void;
  readonly onEdit: (habitId: string) => void;
  readonly onAdd: () => void;
  readonly onHabitsChanged: () => void;
  readonly onRespondToLink: (linkId: string, action: 'accept' | 'decline') => Promise<boolean>;
  readonly onDeleteLink: (linkId: string) => Promise<boolean>;
}

function HabitsTabContent({
  habits, habitsLoading, isDay, isCompleted, getValue, toggling, stats, today,
  activeTimerHabitId, elapsedSeconds, completedMap, linkedHabitIds, calendarCompletions,
  activeLinks, currentUserId, pendingReceived, pendingSent,
  onToggle, onIncrement, onTimerStart, onTimerStop, onEdit, onAdd,
  onHabitsChanged, onRespondToLink, onDeleteLink,
}: HabitsTabContentProps): React.ReactElement {
  if (habitsLoading) {
    return (
      <div className={`text-center py-12 text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
        Cargando hábitos...
      </div>
    );
  }

  return (
    <>
      <HabitList
        habits={habits}
        isDay={isDay}
        isCompleted={isCompleted}
        getValue={getValue}
        toggling={toggling}
        stats={stats}
        today={today}
        activeTimerHabitId={activeTimerHabitId}
        elapsedSeconds={elapsedSeconds}
        onToggle={onToggle}
        onIncrement={onIncrement}
        onTimerStart={onTimerStart}
        onTimerStop={onTimerStop}
        onEdit={onEdit}
        onAdd={onAdd}
        completedDatesMap={completedMap}
        linkedHabitIds={linkedHabitIds}
      />

      {habits.length > 0 && (
        <>
          <HabitCalendar
            completionsByDate={calendarCompletions}
            totalHabits={habits.length}
            isDay={isDay}
          />
          <HabitStats
            stats={stats}
            isDay={isDay}
            onHabitsChanged={onHabitsChanged}
            activeLinks={activeLinks}
            currentUserId={currentUserId}
          />

          <HabitLinkPendingList
            pendingReceived={pendingReceived}
            pendingSent={pendingSent}
            isDay={isDay}
            onRespond={onRespondToLink}
            onCancel={onDeleteLink}
          />
        </>
      )}
    </>
  );
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

  const {
    pendingReceived,
    pendingSent,
    activeLinks,
    respondToLink,
    deleteLink,
  } = useHabitLinks();

  const [activeTab, setActiveTab] = useState<Tab>('habits');
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

  const linkedHabitIds = useMemo(() => {
    const ids = new Set<string>();
    for (const link of activeLinks) {
      ids.add(link.requester_habit_id);
      if (link.responder_habit_id) ids.add(link.responder_habit_id);
    }
    return ids;
  }, [activeLinks]);

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
            aria-selected={activeTab === 'habits'}
            onClick={() => setActiveTab('habits')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'habits' ? tabActiveClass : tabInactiveClass
            }`}
          >
            Mis Hábitos
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

        {activeTab === 'habits' && (
          <HabitsTabContent
            habits={habits}
            habitsLoading={habitsLoading}
            isDay={isDay}
            isCompleted={isCompleted}
            getValue={getValue}
            toggling={toggling}
            stats={stats}
            today={today}
            activeTimerHabitId={activeTimer?.habitId ?? null}
            elapsedSeconds={elapsedSeconds}
            completedMap={completedMap}
            linkedHabitIds={linkedHabitIds}
            calendarCompletions={calendarCompletions}
            activeLinks={activeLinks}
            currentUserId={session.user.id}
            pendingReceived={pendingReceived}
            pendingSent={pendingSent}
            onToggle={handleToggle}
            onIncrement={handleIncrement}
            onTimerStart={handleTimerStart}
            onTimerStop={handleTimerStop}
            onEdit={(habitId) => router.push(`/habits/edit/${habitId}`)}
            onAdd={() => router.push('/habits/new')}
            onHabitsChanged={refetchStats}
            onRespondToLink={respondToLink}
            onDeleteLink={deleteLink}
          />
        )}

        {activeTab === 'community' && (
          <CommunityTab isDay={isDay} />
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
