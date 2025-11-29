'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useHabits } from '@/hooks/useHabits';
import HabitWizard from '@/components/HabitWizard';
import type { HabitWizardData } from '@/components/HabitWizard';

export default function NewHabitPage(): React.ReactElement | null {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();
  const { isDay } = useTheme();
  const { createHabit } = useHabits();

  const handleSubmit = useCallback(async (data: HabitWizardData): Promise<boolean> => {
    const habit = await createHabit(data);
    return habit !== null;
  }, [createHabit]);

  if (isLoading) {
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

  return <HabitWizard mode="create" onSubmit={handleSubmit} />;
}
