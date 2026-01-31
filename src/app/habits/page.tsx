'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useHabits } from '@/hooks/useHabits';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import { useHabitStats } from '@/hooks/useHabitStats';
import HabitList from '@/components/HabitList';
import HabitForm from '@/components/HabitForm';
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

export default function HabitsPage() {
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuthSession();
  const { isDay } = useTheme();
  const { habits, loading: habitsLoading, createHabit, updateHabit, deleteHabit, refetch: refetchHabits } = useHabits();
  const habitIds = useMemo(() => habits.map(h => h.id), [habits]);
  const { isCompleted, toggleLog, toggling, refetch: refetchLogs } = useHabitLogs(habitIds, getCurrentMonth());
  const { stats, refetch: refetchStats } = useHabitStats();

  const [formOpen, setFormOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  const handleCreate = useCallback(async (data: { name: string; description: string; frequency: 'daily' | 'weekly'; targetDaysPerWeek: number; color: string }) => {
    const habit = await createHabit(data);
    if (habit) {
      refetchStats();
      refetchLogs();
      return true;
    }
    return false;
  }, [createHabit, refetchStats, refetchLogs]);

  const handleEdit = useCallback(async (data: { name: string; description: string; frequency: 'daily' | 'weekly'; targetDaysPerWeek: number; color: string }) => {
    if (!editingHabitId) return false;
    const success = await updateHabit(editingHabitId, data);
    if (success) {
      refetchStats();
      return true;
    }
    return false;
  }, [editingHabitId, updateHabit, refetchStats]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const success = await deleteHabit(confirmDelete);
    if (success) {
      setConfirmDelete(null);
      setEditingHabitId(null);
      setFormOpen(false);
      refetchStats();
      refetchLogs();
    }
  }, [confirmDelete, deleteHabit, refetchStats, refetchLogs]);

  const calendarCompletions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const stat of stats) {
      for (const date of Object.keys(stat.completionsByDate)) {
        map[date] = (map[date] ?? 0) + 1;
      }
    }
    return map;
  }, [stats]);

  const editingHabit = editingHabitId ? habits.find(h => h.id === editingHabitId) : undefined;

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
          Habitos
        </h1>

        {habitsLoading ? (
          <div className={`text-center py-12 text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            Cargando habitos...
          </div>
        ) : (
          <>
            <HabitList
              habits={habits}
              isDay={isDay}
              isCompleted={isCompleted}
              toggling={toggling}
              stats={stats}
              today={today}
              onToggle={handleToggle}
              onEdit={(habitId) => {
                setEditingHabitId(habitId);
                setFormOpen(true);
              }}
              onAdd={() => {
                setEditingHabitId(null);
                setFormOpen(true);
              }}
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

      <HabitForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingHabitId(null);
        }}
        onSubmit={editingHabitId ? handleEdit : handleCreate}
        isDay={isDay}
        initialData={editingHabit}
        mode={editingHabitId ? 'edit' : 'create'}
      />

      {editingHabitId && formOpen && (
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-[60]">
          {confirmDelete === editingHabitId ? (
            <div className={`flex gap-2 p-3 rounded-xl ${isDay ? 'bg-[#F5F0E1] shadow-lg' : 'bg-[#2D1E1A] shadow-lg'}`}>
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  isDay
                    ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
                    : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 text-white"
              >
                Confirmar eliminacion
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(editingHabitId)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              Eliminar habito
            </button>
          )}
        </div>
      )}

      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#4A2E1B] text-[#F5F0E1] px-6 py-3 rounded-lg shadow-lg opacity-90 z-[70]">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
