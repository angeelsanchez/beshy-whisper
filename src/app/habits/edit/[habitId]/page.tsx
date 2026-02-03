'use client';

import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useHabits } from '@/hooks/useHabits';
import HabitWizard from '@/components/HabitWizard';
import type { HabitWizardData } from '@/components/HabitWizard';

export default function EditHabitPage(): React.ReactElement | null {
  const params = useParams();
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuthSession();
  const { isDay } = useTheme();
  const { habits, loading: habitsLoading, updateHabit, deleteHabit } = useHabits();

  const rawId = params.habitId;
  const habitId = typeof rawId === 'string' ? rawId : '';

  const handleSubmit = useCallback(async (data: HabitWizardData): Promise<boolean> => {
    return await updateHabit(habitId, data);
  }, [habitId, updateHabit]);

  const handleDelete = useCallback(async (): Promise<boolean> => {
    return await deleteHabit(habitId);
  }, [habitId, deleteHabit]);

  if (authLoading || habitsLoading) {
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

  const habit = habits.find(h => h.id === habitId);
  if (!habit) {
    router.replace('/habits');
    return null;
  }

  return (
    <HabitWizard
      mode="edit"
      initialData={habit}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
