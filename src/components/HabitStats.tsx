'use client';

import { HabitStatData } from '@/hooks/useHabitStats';

interface HabitStatsProps {
  stats: HabitStatData[];
  isDay: boolean;
}

export default function HabitStats({ stats, isDay }: HabitStatsProps) {
  if (stats.length === 0) return null;

  const totalReps = stats.reduce((sum, s) => sum + s.totalRepetitions, 0);
  const avgCompletionRate = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.completionRateWeekly, 0) / stats.length)
    : 0;
  const bestStreak = Math.max(...stats.map(s => s.longestStreak), 0);
  const totalRetomas = stats.reduce((sum, s) => sum + s.retomaCount, 0);

  const milestones = stats.filter(s => s.milestone !== null);

  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <h2 className={`text-base font-bold mb-3 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Estadísticas
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBox label="Repeticiones totales" value={String(totalReps)} isDay={isDay} />
        <StatBox label="Tasa semanal media" value={`${avgCompletionRate}%`} isDay={isDay} />
        <StatBox label="Mejor racha" value={bestStreak > 0 ? `${bestStreak}d` : '-'} isDay={isDay} />
        <StatBox label="Retomas" value={String(totalRetomas)} isDay={isDay} />
      </div>

      {milestones.length > 0 && (
        <div className={`border-t pt-3 ${isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'}`}>
          <h3 className={`text-sm font-semibold mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Hitos alcanzados
          </h3>
          <div className="space-y-1.5">
            {milestones.map(s => (
              <div key={s.habitId} className={`flex items-center gap-2 text-xs ${
                isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'
              }`}>
                <span className={s.milestone === '66_reps' ? 'text-amber-500' : 'text-blue-500'}>
                  {s.milestone === '66_reps' ? '★' : '◆'}
                </span>
                <span className="truncate font-medium">{s.habitName}</span>
                <span className="flex-shrink-0">
                  {s.milestone === '66_reps' ? '66 reps' : '21 reps'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.length > 1 && (
        <div className={`border-t pt-3 mt-3 ${isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'}`}>
          <h3 className={`text-sm font-semibold mb-2 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Detalle por hábito
          </h3>
          <div className="space-y-2">
            {stats.map(s => (
              <div key={s.habitId} className={`flex items-center justify-between text-xs ${
                isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70'
              }`}>
                <span className="truncate font-medium flex-1 min-w-0">{s.habitName}</span>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2 tabular-nums">
                  <span>{s.completionRateWeekly}%</span>
                  <span>{s.totalRepetitions}r</span>
                  {s.currentStreak > 0 && <span>{s.currentStreak}d</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, isDay }: { label: string; value: string; isDay: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${isDay ? 'bg-[#4A2E1B]/8' : 'bg-[#F5F0E1]/8'}`}>
      <p className={`text-lg font-bold tabular-nums ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        {value}
      </p>
      <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
        {label}
      </p>
    </div>
  );
}
