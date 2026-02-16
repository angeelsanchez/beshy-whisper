'use client';

import { useState, useEffect } from 'react';
import { useHabitLevels } from '@/hooks/useHabitLevels';
import type { EvolutionPeriod } from '@/hooks/useHabitLevels';
import { TrendingUp, ChevronUp, ChevronDown, Award } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HabitEvolutionProps {
  readonly habitId: string;
  readonly isDay: boolean;
  readonly shouldSuggestAdvance: boolean;
  readonly currentLevel: number;
  readonly maxLevel: number;
  readonly onAdvanced?: () => void;
  readonly onDecreased?: () => void;
}

function PeriodBar({
  period,
  isDay,
  isCurrent,
}: {
  readonly period: EvolutionPeriod;
  readonly isDay: boolean;
  readonly isCurrent: boolean;
}): React.ReactElement {
  const muted = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const barBg = isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        isCurrent
          ? (isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]')
          : (isDay ? 'bg-[#4A2E1B]/15 text-[#4A2E1B]' : 'bg-[#F5F0E1]/15 text-[#F5F0E1]')
      }`}>
        {period.levelNumber}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-xs font-medium truncate ${text}`}>
            {period.label ?? `Nivel ${period.levelNumber}`}
          </span>
          <span className={`text-[10px] tabular-nums ${muted}`}>
            {period.completionRate}% · {period.daysInLevel}d
          </span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${barBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              period.completionRate >= 80
                ? 'bg-green-500'
                : period.completionRate >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-400'
            }`}
            style={{ width: `${period.completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function HabitEvolution({
  habitId,
  isDay,
  shouldSuggestAdvance,
  currentLevel,
  maxLevel,
  onAdvanced,
  onDecreased,
}: HabitEvolutionProps): React.ReactElement | null {
  const { evolution, fetchEvolution, advanceLevel } = useHabitLevels(habitId);
  const [advancing, setAdvancing] = useState(false);
  const [decreasing, setDecreasing] = useState(false);
  const [showDecreaseConfirm, setShowDecreaseConfirm] = useState(false);

  useEffect(() => {
    fetchEvolution();
  }, [fetchEvolution]);

  const handleAdvance = async (): Promise<void> => {
    setAdvancing(true);
    const result = await advanceLevel();
    setAdvancing(false);
    if (result) {
      fetchEvolution();
      onAdvanced?.();
    }
  };

  const confirmDecrease = (): void => {
    setShowDecreaseConfirm(true);
  };

  const executeDecrease = async (): Promise<void> => {
    setDecreasing(true);
    try {
      const response = await fetch(`/api/habits/${habitId}/decrease-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al bajar de nivel');
      }

      fetchEvolution();
      onDecreased?.();
      setShowDecreaseConfirm(false);
    } catch (error) {
      logger.error('Error al bajar de nivel', { error: String(error) });
    } finally {
      setDecreasing(false);
    }
  };

  const handleDecrease = (): void => {
    if (showDecreaseConfirm) {
      executeDecrease();
    } else {
      confirmDecrease();
    }
  };

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const muted = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const isMaxLevel = currentLevel >= maxLevel;
  const canDecrease = currentLevel > 1;

  const suggestedAdvanceColor = isDay ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20' : 'bg-green-400/10 text-green-400 hover:bg-green-400/20';
  const defaultButtonColor = isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/10 hover:text-[#4A2E1B]/80' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/10 hover:text-[#F5F0E1]/80';
  const advanceButtonClass = shouldSuggestAdvance ? suggestedAdvanceColor : defaultButtonColor;

  const confirmDecreaseColor = isDay ? 'bg-red-600/10 text-red-700 hover:bg-red-600/20' : 'bg-red-400/10 text-red-400 hover:bg-red-400/20';
  const decreaseButtonClass = showDecreaseConfirm ? confirmDecreaseColor : defaultButtonColor;

  const maxLevelClass = isDay ? 'bg-amber-500/10 text-amber-700' : 'bg-amber-400/10 text-amber-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className={`w-4 h-4 ${text}`} strokeWidth={2} />
        <h3 className={`text-sm font-semibold ${text}`}>
          Evolución
        </h3>
        <span className={`text-[10px] tabular-nums ${muted}`}>
          Nivel {currentLevel}/{maxLevel}
        </span>
      </div>

      {evolution?.periods && evolution.periods.length > 0 ? (
        <div className="space-y-2">
          {evolution.periods.map((period) => (
            <PeriodBar
              key={period.levelNumber}
              period={period}
              isDay={isDay}
              isCurrent={period.levelNumber === currentLevel}
            />
          ))}
        </div>
      ) : (
        <p className={`text-xs ${muted}`}>Cargando evolución...</p>
      )}

      <div className="flex gap-2">
        {!isMaxLevel && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              advancing ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
            } ${advanceButtonClass}`}
          >
            <ChevronUp className="w-4 h-4" strokeWidth={2} />
            {advancing ? 'Avanzando...' : 'Subir de nivel'}
          </button>
        )}

        {canDecrease && (
          <button
            onClick={handleDecrease}
            disabled={decreasing}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              decreasing ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
            } ${decreaseButtonClass}`}
            title={showDecreaseConfirm ? 'Click nuevamente para confirmar' : 'Bajar de nivel'}
          >
            <ChevronDown className="w-4 h-4" strokeWidth={2} />
            {decreasing ? 'Bajando...' : showDecreaseConfirm ? 'Confirmar' : 'Bajar de nivel'}
          </button>
        )}
      </div>

      {isMaxLevel && (
        <div className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium ${maxLevelClass}`}>
          <Award className="w-4 h-4" strokeWidth={2} />
          Nivel máximo alcanzado
        </div>
      )}
    </div>
  );
}
