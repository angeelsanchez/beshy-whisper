'use client';

import { HabitStatData } from '@/hooks/useHabitStats';

interface HabitStatsProps {
  readonly stats: HabitStatData[];
  readonly isDay: boolean;
}

function formatValue(value: number, unit: string | null): string {
  const rounded = value % 1 === 0 ? String(value) : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

function HabitDetailBinary({ stat, subtle }: {
  readonly stat: HabitStatData;
  readonly subtle: string;
}): React.ReactElement {
  return (
    <div className={`flex items-center gap-3 ${subtle}`}>
      <span>{stat.completionRateWeekly}% esta semana</span>
      <span>·</span>
      <span>{stat.totalRepetitions} veces</span>
    </div>
  );
}

function HabitDetailQuantity({ stat, subtle }: {
  readonly stat: HabitStatData;
  readonly subtle: string;
}): React.ReactElement {
  return (
    <div className={`flex items-center gap-3 flex-wrap ${subtle}`}>
      <span>{stat.completionRateWeekly}% esta semana</span>
      {stat.totalValue !== null && stat.totalValue > 0 && (
        <>
          <span>·</span>
          <span>{formatValue(stat.totalValue, stat.unit)} total</span>
        </>
      )}
      {stat.avgDailyValue !== null && stat.avgDailyValue > 0 && (
        <>
          <span>·</span>
          <span>~{formatValue(stat.avgDailyValue, stat.unit)}/día</span>
        </>
      )}
    </div>
  );
}

function QuantitySummarySection({ quantityStats, border, text, isDay }: {
  readonly quantityStats: HabitStatData[];
  readonly border: string;
  readonly text: string;
  readonly isDay: boolean;
}): React.ReactElement | null {
  if (quantityStats.length === 0) return null;

  return (
    <div className={`border-t pt-3 mt-1 ${border}`}>
      <h3 className={`text-sm font-semibold mb-2 ${text}`}>
        Totales acumulados
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {quantityStats.map(s => {
          const total = s.totalValue ?? 0;
          if (total <= 0) return null;
          return (
            <StatBox
              key={s.habitId}
              value={formatValue(total, s.unit)}
              label={s.habitName}
              hint={s.avgDailyValue !== null && s.avgDailyValue > 0
                ? `~${formatValue(s.avgDailyValue, s.unit)}/día`
                : undefined}
              isDay={isDay}
              small
            />
          );
        })}
      </div>
    </div>
  );
}

export default function HabitStats({ stats, isDay }: Readonly<HabitStatsProps>): React.ReactElement | null {
  if (stats.length === 0) return null;

  const totalReps = stats.reduce((sum, s) => sum + s.totalRepetitions, 0);
  const avgCompletionRate = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.completionRateWeekly, 0) / stats.length)
    : 0;
  const bestStreak = Math.max(...stats.map(s => s.longestStreak), 0);
  const totalRetomas = stats.reduce((sum, s) => sum + s.retomaCount, 0);
  const milestones = stats.filter(s => s.milestone !== null);
  const quantityStats = stats.filter(s => s.trackingType === 'quantity' || s.trackingType === 'timer');

  const subtle = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const textMuted = isDay ? 'text-[#4A2E1B]/70' : 'text-[#F5F0E1]/70';
  const border = isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10';

  return (
    <div className={`rounded-xl p-4 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}>
      <h2 className={`text-base font-bold mb-3 ${text}`}>
        Estadísticas
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatBox
          value={String(totalReps)}
          label="Veces completados"
          isDay={isDay}
        />
        <StatBox
          value={`${avgCompletionRate}%`}
          label="Consistencia semanal"
          hint="Media de los últimos 7 días"
          isDay={isDay}
        />
        <StatBox
          value={bestStreak > 0 ? `${bestStreak} días` : '-'}
          label="Mejor racha"
          isDay={isDay}
        />
        <StatBox
          value={String(totalRetomas)}
          label="Vueltas al hábito"
          hint="Retomaste tras 7+ días de pausa"
          isDay={isDay}
        />
      </div>

      <QuantitySummarySection
        quantityStats={quantityStats}
        border={border}
        text={text}
        isDay={isDay}
      />

      {milestones.length > 0 && (
        <div className={`border-t pt-3 mt-3 ${border}`}>
          <h3 className={`text-sm font-semibold mb-2 ${text}`}>
            Hitos alcanzados
          </h3>
          <div className="space-y-2">
            {milestones.map(s => (
              <div key={s.habitId} className={`flex items-center gap-2 text-xs ${textMuted}`}>
                <span className={`text-sm ${s.milestone === '66_reps' ? 'text-amber-500' : 'text-blue-500'}`}>
                  {s.milestone === '66_reps' ? '★' : '◆'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{s.habitName}</span>
                  <span className={`text-[10px] ${subtle}`}>
                    {s.milestone === '66_reps'
                      ? '66 días — hábito consolidado'
                      : '21 días — hábito en formación'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.length > 1 && (
        <div className={`border-t pt-3 mt-3 ${border}`}>
          <h3 className={`text-sm font-semibold mb-2 ${text}`}>
            Detalle por hábito
          </h3>
          <div className="space-y-2.5">
            {stats.map(s => (
              <div key={s.habitId} className={`text-xs ${textMuted}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium truncate flex-1 min-w-0">{s.habitName}</span>
                  {s.currentStreak > 0 && (
                    <span className="flex items-center gap-0.5 flex-shrink-0 ml-2 tabular-nums">
                      <span className="text-orange-400">🔥</span>
                      {s.currentStreak} días
                    </span>
                  )}
                </div>
                {s.trackingType === 'quantity' || s.trackingType === 'timer'
                  ? <HabitDetailQuantity stat={s} subtle={subtle} />
                  : <HabitDetailBinary stat={s} subtle={subtle} />
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ value, label, hint, isDay, small }: {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  readonly isDay: boolean;
  readonly small?: boolean;
}): React.ReactElement {
  const valueSize = small ? 'text-base' : 'text-lg';
  return (
    <div className={`p-3 rounded-lg ${isDay ? 'bg-[#4A2E1B]/8' : 'bg-[#F5F0E1]/8'}`}>
      <p className={`${valueSize} font-bold tabular-nums ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        {value}
      </p>
      <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'} ${small ? 'truncate' : ''}`}>
        {label}
      </p>
      {hint && (
        <p className={`text-[10px] mt-0.5 ${isDay ? 'text-[#4A2E1B]/35' : 'text-[#F5F0E1]/35'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
