'use client';

import { useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';

interface InitiativeCheckinButtonProps {
  readonly initiativeId: string;
  readonly trackingType: 'binary' | 'quantity' | 'timer';
  readonly targetValue: number | null;
  readonly unit: string | null;
  readonly currentValue: number | null;
  readonly isCheckedIn: boolean;
  readonly checking: boolean;
  readonly color: string;
  readonly isDay: boolean;
  readonly onCheckin: (value?: number) => void;
}

function formatTimerDisplay(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function BinaryCheckin({
  isCheckedIn,
  checking,
  color,
  isDay,
  onCheckin,
}: {
  readonly isCheckedIn: boolean;
  readonly checking: boolean;
  readonly color: string;
  readonly isDay: boolean;
  readonly onCheckin: () => void;
}): React.ReactElement {
  const textOnColor = '#FFFFFF';
  const uncheckedBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const uncheckedText = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';

  return (
    <button
      onClick={onCheckin}
      disabled={checking}
      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
        checking ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'
      } ${isCheckedIn ? '' : `${uncheckedBg} ${uncheckedText}`}`}
      style={isCheckedIn ? { backgroundColor: color, color: textOnColor } : undefined}
      aria-label={isCheckedIn ? 'Deshacer check-in' : 'Hacer check-in'}
    >
      {isCheckedIn ? (
        <span className="flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
          </svg>
          Completado
        </span>
      ) : (
        'Check-in'
      )}
    </button>
  );
}

function QuantityCheckin({
  currentValue,
  targetValue,
  unit,
  color,
  checking,
  isDay,
  onCheckin,
}: {
  readonly currentValue: number;
  readonly targetValue: number;
  readonly unit: string;
  readonly color: string;
  readonly checking: boolean;
  readonly isDay: boolean;
  readonly onCheckin: (value: number) => void;
}): React.ReactElement {
  const progressPct = Math.min((currentValue / Math.max(targetValue, 1)) * 100, 100);
  const isComplete = currentValue >= targetValue;
  const bgTrack = isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const btnBg = isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${textColor}`}>
          {currentValue}/{targetValue} {unit}
        </span>
        {isComplete && (
          <span className="text-xs font-semibold text-green-500">Completado</span>
        )}
      </div>

      <div className={`w-full h-2.5 rounded-full overflow-hidden ${bgTrack}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: color }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onCheckin(-1)}
          disabled={checking || currentValue <= 0}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            checking || currentValue <= 0
              ? 'opacity-30 cursor-not-allowed'
              : 'active:scale-[0.98]'
          } ${btnBg} ${textColor}`}
          aria-label="Decrementar"
        >
          −
        </button>
        <button
          onClick={() => onCheckin(1)}
          disabled={checking}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            checking ? 'opacity-30 cursor-not-allowed' : 'active:scale-[0.98]'
          } ${btnBg} ${textColor}`}
          aria-label="Incrementar"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TimerCheckin({
  initiativeId,
  currentValue,
  targetValue,
  unit,
  color,
  isDay,
  onCheckin,
}: {
  readonly initiativeId: string;
  readonly currentValue: number;
  readonly targetValue: number;
  readonly unit: string;
  readonly color: string;
  readonly isDay: boolean;
  readonly onCheckin: (value: number) => void;
}): React.ReactElement {
  const { isRunning, elapsedSeconds, start, stop } = useTimer();
  const timerKey = `init-${initiativeId}`;
  const running = isRunning(timerKey);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const displayValue = currentValue + elapsedMinutes;
  const progressPct = Math.min((displayValue / Math.max(targetValue, 1)) * 100, 100);
  const bgTrack = isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';

  const handleToggleTimer = useCallback((): void => {
    if (running) {
      const minutes = stop();
      if (minutes > 0) {
        onCheckin(minutes);
      }
    } else {
      start(timerKey);
    }
  }, [running, stop, start, timerKey, onCheckin]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${textColor}`}>
          {displayValue}/{targetValue} {unit}
        </span>
        {running && (
          <span className={`text-xs font-mono tabular-nums ${subtextColor}`}>
            {formatTimerDisplay(elapsedSeconds)}
          </span>
        )}
      </div>

      <div className={`w-full h-2.5 rounded-full overflow-hidden ${bgTrack}`}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%`, backgroundColor: color }}
        />
      </div>

      <button
        onClick={handleToggleTimer}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
          running
            ? 'bg-red-500/20 text-red-500'
            : isDay
              ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
              : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
        }`}
        aria-label={running ? 'Detener temporizador' : 'Iniciar temporizador'}
      >
        {running ? <><Square className="w-4 h-4 inline mr-1" fill="currentColor" /> Detener</> : <><Play className="w-4 h-4 inline mr-1" fill="currentColor" /> Iniciar</>}
      </button>
    </div>
  );
}

export default function InitiativeCheckinButton({
  initiativeId,
  trackingType,
  targetValue,
  unit,
  currentValue,
  isCheckedIn,
  checking,
  color,
  isDay,
  onCheckin,
}: InitiativeCheckinButtonProps): React.ReactElement {
  if (trackingType === 'timer' && targetValue !== null && unit !== null) {
    return (
      <TimerCheckin
        initiativeId={initiativeId}
        currentValue={currentValue ?? 0}
        targetValue={targetValue}
        unit={unit}
        color={color}
        isDay={isDay}
        onCheckin={onCheckin}
      />
    );
  }

  if (trackingType === 'quantity' && targetValue !== null && unit !== null) {
    return (
      <QuantityCheckin
        currentValue={currentValue ?? 0}
        targetValue={targetValue}
        unit={unit}
        color={color}
        checking={checking}
        isDay={isDay}
        onCheckin={onCheckin}
      />
    );
  }

  return (
    <BinaryCheckin
      isCheckedIn={isCheckedIn}
      checking={checking}
      color={color}
      isDay={isDay}
      onCheckin={() => onCheckin()}
    />
  );
}
