'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Award } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HabitLevelRowProps {
  readonly habitId: string;
  readonly habitName: string;
  readonly isDay: boolean;
  readonly shouldSuggestAdvance: boolean;
  readonly currentLevel: number;
  readonly maxLevel: number;
  readonly onChanged?: () => void;
}

export default function HabitLevelRow({
  habitId,
  habitName,
  isDay,
  shouldSuggestAdvance,
  currentLevel,
  maxLevel,
  onChanged,
}: HabitLevelRowProps): React.ReactElement {
  const [advancing, setAdvancing] = useState(false);
  const [decreasing, setDecreasing] = useState(false);
  const [confirmDecrease, setConfirmDecrease] = useState(false);

  const isMaxLevel = currentLevel >= maxLevel;
  const canDecrease = currentLevel > 1;

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const muted = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';

  const handleAdvance = async (): Promise<void> => {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/advance-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) onChanged?.();
    } catch (error) {
      logger.error('Error al subir de nivel', { error: String(error) });
    } finally {
      setAdvancing(false);
    }
  };

  const handleDecrease = async (): Promise<void> => {
    if (!confirmDecrease) {
      setConfirmDecrease(true);
      return;
    }
    setDecreasing(true);
    try {
      const res = await fetch(`/api/habits/${habitId}/decrease-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) onChanged?.();
    } catch (error) {
      logger.error('Error al bajar de nivel', { error: String(error) });
    } finally {
      setDecreasing(false);
      setConfirmDecrease(false);
    }
  };

  const btnBase = `p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`;
  const btnUp = shouldSuggestAdvance
    ? (isDay ? 'bg-green-600/10 text-green-700 hover:bg-green-600/20' : 'bg-green-400/10 text-green-400 hover:bg-green-400/20')
    : (isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/10');
  const btnDown = confirmDecrease
    ? (isDay ? 'bg-red-600/10 text-red-700 hover:bg-red-600/20' : 'bg-red-400/10 text-red-400 hover:bg-red-400/20')
    : (isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/60 hover:bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/60 hover:bg-[#F5F0E1]/10');

  return (
    <div className="flex items-center gap-2">
      <span className={`flex-1 text-sm font-medium truncate ${text}`}>
        {habitName}
      </span>

      {isMaxLevel ? (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${
          isDay ? 'bg-amber-500/10 text-amber-700' : 'bg-amber-400/10 text-amber-400'
        }`}>
          <Award className="w-3 h-3" strokeWidth={2} />
          Máx
        </div>
      ) : (
        <span className={`text-xs tabular-nums whitespace-nowrap ${muted}`}>
          Nivel {currentLevel}/{maxLevel}
        </span>
      )}

      {!isMaxLevel && (
        <button
          onClick={handleAdvance}
          disabled={advancing}
          className={`${btnBase} ${btnUp}`}
          title="Subir de nivel"
        >
          <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
      )}

      {canDecrease && (
        <button
          onClick={handleDecrease}
          disabled={decreasing}
          className={`${btnBase} ${btnDown}`}
          title={confirmDecrease ? 'Pulsa de nuevo para confirmar' : 'Bajar de nivel'}
        >
          <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
