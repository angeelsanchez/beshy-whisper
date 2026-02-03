'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'beshy-active-timer';
const TICK_INTERVAL_MS = 1000;
const MAX_TIMER_DURATION_MS = 24 * 60 * 60 * 1000;

interface TimerState {
  habitId: string;
  startedAt: number;
}

export interface UseTimerReturn {
  activeTimer: TimerState | null;
  elapsedSeconds: number;
  isRunning: (habitId: string) => boolean;
  start: (habitId: string) => void;
  stop: () => number;
  cancel: () => void;
}

function readStoredTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('habitId' in parsed) ||
      !('startedAt' in parsed) ||
      typeof (parsed as TimerState).habitId !== 'string' ||
      typeof (parsed as TimerState).startedAt !== 'number'
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const timer = parsed as TimerState;

    if (Date.now() - timer.startedAt > MAX_TIMER_DURATION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return timer;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredTimer(timer: TimerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
  } catch {
    // storage full or unavailable
  }
}

function clearStoredTimer(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}

function calcElapsed(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function useTimer(): UseTimerReturn {
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInterval = useCallback((): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback((startedAt: number): void => {
    stopInterval();
    setElapsedSeconds(calcElapsed(startedAt));
    intervalRef.current = setInterval(() => {
      const elapsed = calcElapsed(startedAt);

      if (elapsed > MAX_TIMER_DURATION_MS / 1000) {
        clearStoredTimer();
        setActiveTimer(null);
        setElapsedSeconds(0);
        return;
      }

      setElapsedSeconds(elapsed);
    }, TICK_INTERVAL_MS);
  }, [stopInterval]);

  useEffect(() => {
    const stored = readStoredTimer();
    if (stored) {
      setActiveTimer(stored);
      startInterval(stored.startedAt);
    }
  }, [startInterval]);

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.visibilityState !== 'visible') return;

      const stored = readStoredTimer();
      if (stored) {
        setActiveTimer(stored);
        setElapsedSeconds(calcElapsed(stored.startedAt));
      } else {
        stopInterval();
        setActiveTimer(null);
        setElapsedSeconds(0);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopInterval]);

  useEffect(() => {
    function handleStorageChange(e: StorageEvent): void {
      if (e.key !== STORAGE_KEY) return;

      if (!e.newValue) {
        stopInterval();
        setActiveTimer(null);
        setElapsedSeconds(0);
        return;
      }

      const stored = readStoredTimer();
      if (stored) {
        setActiveTimer(stored);
        startInterval(stored.startedAt);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [stopInterval, startInterval]);

  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  const isRunning = useCallback(
    (habitId: string): boolean => activeTimer?.habitId === habitId,
    [activeTimer]
  );

  const start = useCallback((habitId: string): void => {
    const timer: TimerState = { habitId, startedAt: Date.now() };
    writeStoredTimer(timer);
    setActiveTimer(timer);
    startInterval(timer.startedAt);
  }, [startInterval]);

  const stop = useCallback((): number => {
    if (!activeTimer) return 0;

    const elapsedMinutes = Math.floor((Date.now() - activeTimer.startedAt) / 60000);
    clearStoredTimer();
    stopInterval();
    setActiveTimer(null);
    setElapsedSeconds(0);
    return elapsedMinutes;
  }, [activeTimer, stopInterval]);

  const cancel = useCallback((): void => {
    clearStoredTimer();
    stopInterval();
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [stopInterval]);

  return { activeTimer, elapsedSeconds, isRunning, start, stop, cancel };
}
