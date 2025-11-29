'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Square } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/context/ThemeContext';
import { logger } from '@/lib/logger';

function getTimerDestination(habitId: string): string {
  if (habitId.startsWith('init-')) {
    return `/initiatives/${habitId.slice(5)}`;
  }
  return '/habits';
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function saveTimerMinutes(timerId: string, minutes: number): Promise<boolean> {
  if (minutes <= 0) return true;

  const isInitiative = timerId.startsWith('init-');

  try {
    if (isInitiative) {
      const initiativeId = timerId.slice(5);
      const res = await fetch(`/api/initiatives/${initiativeId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: minutes }),
      });
      return res.ok;
    } else {
      const res = await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: timerId, date: getTodayDate(), value: minutes }),
      });
      return res.ok;
    }
  } catch (error) {
    logger.error('Error saving timer minutes', { timerId, minutes, error });
    return false;
  }
}

export default function FloatingTimer(): React.ReactElement | null {
  const router = useRouter();
  const { activeTimer, elapsedSeconds, stop } = useTimer();
  const { isDay } = useTheme();
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTimer) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
    } else {
      setShow(false);
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [activeTimer]);

  const handleNavigate = useCallback((): void => {
    if (!activeTimer) return;
    router.push(getTimerDestination(activeTimer.habitId));
  }, [activeTimer, router]);

  const handleStop = useCallback(async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (!activeTimer || saving) return;

    setSaving(true);
    const minutes = stop();
    const success = await saveTimerMinutes(activeTimer.habitId, minutes);

    if (success) {
      globalThis.dispatchEvent(new Event('habits-changed'));
    }
    setSaving(false);
  }, [activeTimer, saving, stop]);

  if (!visible) return null;

  const isInitiative = activeTimer?.habitId.startsWith('init-');

  return (
    <div
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      className={`fixed right-3 z-[45] flex items-center gap-1 rounded-full shadow-lg transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${
        isDay
          ? 'bg-[#4A2E1B] text-[#F5F0E1]'
          : 'bg-[#F5F0E1] text-[#2D1E1A]'
      }`}
    >
      <button
        onClick={handleNavigate}
        aria-label={`Timer activo: ${formatElapsed(elapsedSeconds)}. Pulsa para ${isInitiative ? 'ir a la iniciativa' : 'ir a hábitos'}`}
        className="flex items-center gap-2 pl-3 pr-2 py-2 cursor-pointer active:scale-95 transition-transform"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isDay ? 'bg-green-400' : 'bg-green-300'
          }`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isDay ? 'bg-green-400' : 'bg-green-300'
          }`} />
        </span>
        <span className="text-sm font-mono font-semibold tabular-nums">
          {formatElapsed(elapsedSeconds)}
        </span>
      </button>
      <button
        onClick={handleStop}
        disabled={saving}
        aria-label="Detener y guardar timer"
        className={`p-2 mr-1 rounded-full transition-all ${
          saving
            ? 'opacity-50 cursor-not-allowed'
            : 'active:scale-90 hover:bg-red-500/20'
        }`}
      >
        <Square
          className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`}
          fill="currentColor"
        />
      </button>
    </div>
  );
}
