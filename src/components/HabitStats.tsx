'use client';

import { HabitStatData } from '@/hooks/useHabitStats';
import HabitEvolution from '@/components/HabitEvolution';
import HabitLinkPartnerIndicator from '@/components/HabitLinkPartnerIndicator';
import HabitChartsSimple from '@/components/HabitChartsSimple';
import type { HabitLink } from '@/hooks/useHabitLinks';
import { useAuthSession } from '@/hooks/useAuthSession';

interface HabitStatsProps {
  readonly stats: HabitStatData[];
  readonly isDay: boolean;
  readonly onHabitsChanged?: () => void;
  readonly activeLinks?: HabitLink[];
  readonly currentUserId?: string;
}

export default function HabitStats({ stats, isDay, onHabitsChanged, activeLinks = [], currentUserId }: Readonly<HabitStatsProps>): React.ReactElement | null {
  const { session } = useAuthSession();

  if (stats.length === 0 || !session?.user?.id) return null;

  const progressiveStats = stats.filter(s => s.hasProgression && s.currentLevel !== null && s.maxLevel !== null);
  const border = isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10';
  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';

  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <h2 className={`text-base font-bold mb-4 ${text}`}>
        Análisis y progreso
      </h2>

      <HabitChartsSimple isDay={isDay} />

      {progressiveStats.length > 0 && (
        <div className={`border-t pt-3 mt-4 space-y-4 ${border}`}>
          <h3 className={`text-sm font-semibold ${text}`}>
            Progresión de niveles
          </h3>
          {progressiveStats.map(s => (
            <div key={s.habitId}>
              <p className={`text-xs font-medium mb-2 ${isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'}`}>
                {s.habitName}
              </p>
              <HabitEvolution
                habitId={s.habitId}
                isDay={isDay}
                shouldSuggestAdvance={s.shouldSuggestAdvance}
                currentLevel={s.currentLevel!}
                maxLevel={s.maxLevel!}
                onAdvanced={onHabitsChanged}
              />
            </div>
          ))}
        </div>
      )}

      {activeLinks.length > 0 && currentUserId && (
        <div className={`border-t pt-3 mt-4 ${border}`}>
          <h3 className={`text-sm font-semibold mb-2 ${text}`}>
            Compañeros de hábito
          </h3>
          <div className="space-y-1.5">
            {activeLinks.map(link => (
              <HabitLinkPartnerIndicator
                key={link.id}
                link={link}
                currentUserId={currentUserId}
                isDay={isDay}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
