'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTimer } from '@/hooks/useTimer';
import { useTheme } from '@/context/ThemeContext';

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

export default function FloatingTimer(): React.ReactElement | null {
  const router = useRouter();
  const { activeTimer, elapsedSeconds } = useTimer();
  const { isDay } = useTheme();
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);

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

  const handleClick = useCallback((): void => {
    if (!activeTimer) return;
    router.push(getTimerDestination(activeTimer.habitId));
  }, [activeTimer, router]);

  if (!visible) return null;

  const isInitiative = activeTimer?.habitId.startsWith('init-');

  return (
    <button
      onClick={handleClick}
      aria-label={`Timer activo: ${formatElapsed(elapsedSeconds)}. Pulsa para ${isInitiative ? 'ir a la iniciativa' : 'ir a hábitos'}`}
      className={`fixed top-3 right-3 z-[45] flex items-center gap-2 px-3 py-2 rounded-full shadow-lg cursor-pointer active:scale-95 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${
        isDay
          ? 'bg-[#4A2E1B] text-[#F5F0E1]'
          : 'bg-[#F5F0E1] text-[#2D1E1A]'
      }`}
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
  );
}
