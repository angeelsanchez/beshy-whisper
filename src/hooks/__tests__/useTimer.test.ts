import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../useTimer';

const STORAGE_KEY = 'beshy-active-timer';

describe('useTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no active timer', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.activeTimer).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('start stores timer in localStorage', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start('habit-1');
    });

    expect(result.current.activeTimer).not.toBeNull();
    expect(result.current.activeTimer?.habitId).toBe('habit-1');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.habitId).toBe('habit-1');
    expect(stored.startedAt).toBeGreaterThan(0);
  });

  it('isRunning returns true for active habit', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start('habit-1');
    });

    expect(result.current.isRunning('habit-1')).toBe(true);
    expect(result.current.isRunning('habit-2')).toBe(false);
  });

  it('stop returns elapsed minutes', () => {
    const startTime = new Date(2026, 0, 15, 10, 0, 0).getTime();
    vi.setSystemTime(startTime);

    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start('habit-1');
    });

    vi.setSystemTime(startTime + 5 * 60 * 1000);

    let minutes = 0;
    act(() => {
      minutes = result.current.stop();
    });

    expect(minutes).toBe(5);
    expect(result.current.activeTimer).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('stop returns 0 when no timer active', () => {
    const { result } = renderHook(() => useTimer());

    let minutes = 0;
    act(() => {
      minutes = result.current.stop();
    });

    expect(minutes).toBe(0);
  });

  it('cancel clears timer without returning minutes', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start('habit-1');
    });

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.activeTimer).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('recovers timer from localStorage on mount', () => {
    const startedAt = Date.now() - 3 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ habitId: 'habit-1', startedAt }));

    const { result } = renderHook(() => useTimer());

    expect(result.current.activeTimer).not.toBeNull();
    expect(result.current.activeTimer?.habitId).toBe('habit-1');
    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(180);
  });

  it('auto-cancels timer older than 24 hours', () => {
    const startedAt = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ habitId: 'habit-1', startedAt }));

    const { result } = renderHook(() => useTimer());

    expect(result.current.activeTimer).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears invalid localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    const { result } = renderHook(() => useTimer());

    expect(result.current.activeTimer).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears localStorage with invalid shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));

    const { result } = renderHook(() => useTimer());

    expect(result.current.activeTimer).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('elapsedSeconds updates with interval', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start('habit-1');
    });

    expect(result.current.elapsedSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(3);
  });

  it('starting a new timer replaces the previous one', () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start('habit-1');
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    act(() => {
      result.current.start('habit-2');
    });

    expect(result.current.activeTimer?.habitId).toBe('habit-2');
    expect(result.current.isRunning('habit-1')).toBe(false);
    expect(result.current.isRunning('habit-2')).toBe(true);
  });
});
