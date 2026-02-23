import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockUseAuthSession } = vi.hoisted(() => {
  const mockUseAuthSession = vi.fn();
  return { mockUseAuthSession };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: mockUseAuthSession,
}));

import { useHabits, type Habit } from '../useHabits';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeFetchResponse(data: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response;
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    user_id: 'user-123',
    name: 'Run daily',
    description: null,
    frequency: 'daily',
    frequency_mode: 'specific_days',
    target_days_per_week: 5,
    target_days: [1, 2, 3, 4, 5],
    weekly_target: null,
    color: '#3b82f6',
    tracking_type: 'binary',
    target_value: null,
    unit: null,
    icon: null,
    category: 'health',
    reminder_time: null,
    has_progression: false,
    current_level: null,
    level_started_at: null,
    is_shareable: false,
    is_active: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupAuthenticatedSession(userId = 'user-123') {
  mockUseAuthSession.mockReturnValue({
    session: { user: { id: userId } },
    isLoading: false,
  });
}

function setupNoSession() {
  mockUseAuthSession.mockReturnValue({
    session: null,
    isLoading: false,
  });
}

describe('useHabits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty habits array and no error', () => {
      setupNoSession();

      const { result } = renderHook(() => useHabits());

      expect(result.current.habits).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('exposes createHabit, updateHabit, deleteHabit, refetch functions', () => {
      setupNoSession();

      const { result } = renderHook(() => useHabits());

      expect(typeof result.current.createHabit).toBe('function');
      expect(typeof result.current.updateHabit).toBe('function');
      expect(typeof result.current.deleteHabit).toBe('function');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('when no session', () => {
    it('sets loading to false without fetching', async () => {
      setupNoSession();

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.habits).toEqual([]);
    });
  });

  describe('fetches habits on mount', () => {
    it('calls GET /api/habits and populates habits', async () => {
      setupAuthenticatedSession();
      const habits = [makeHabit({ id: 'habit-1' }), makeHabit({ id: 'habit-2', name: 'Meditate' })];
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/habits');
      expect(result.current.habits).toEqual(habits);
      expect(result.current.error).toBeNull();
    });

    it('sets error when response is not ok', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Error al cargar hábitos');
      expect(result.current.habits).toEqual([]);
    });

    it('sets error on network failure', async () => {
      setupAuthenticatedSession();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Error de conexión');
      expect(result.current.habits).toEqual([]);
    });

    it('handles empty habits list', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.habits).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('refetch', () => {
    it('fetches habits again when refetch is called', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValue(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('window events', () => {
    it('refetches when habits-changed event fires', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValue(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        window.dispatchEvent(new Event('habits-changed'));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('refetches on window focus event', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValue(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('removes event listeners on unmount', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValue(makeFetchResponse({ habits: [] }));

      const { result, unmount } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callsBefore = mockFetch.mock.calls.length;

      unmount();

      window.dispatchEvent(new Event('habits-changed'));
      window.dispatchEvent(new Event('focus'));

      await new Promise(resolve => setTimeout(resolve, 30));

      expect(mockFetch.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('createHabit', () => {
    it('returns null when no session', async () => {
      setupNoSession();

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let habit: Habit | null = makeHabit();
      await act(async () => {
        habit = await result.current.createHabit({ name: 'New Habit' });
      });

      expect(habit).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('POSTs to /api/habits and appends the new habit to state', async () => {
      setupAuthenticatedSession();
      const existing = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [existing] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newHabit = makeHabit({ id: 'habit-2', name: 'New Habit' });
      const bothHabits = [existing, newHabit];
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ habit: newHabit }))
        .mockResolvedValueOnce(makeFetchResponse({ habits: bothHabits }));

      let created: Habit | null = null;
      await act(async () => {
        created = await result.current.createHabit({ name: 'New Habit' });
      });

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(2);
      });

      expect(created).toEqual(newHabit);
      expect(result.current.habits[1]).toEqual(newHabit);
      expect(result.current.error).toBeNull();

      const createCall = mockFetch.mock.calls[1];
      expect(createCall[0]).toBe('/api/habits');
      expect(createCall[1]).toMatchObject({ method: 'POST' });
    });

    it('dispatches habits-changed event after successful create', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newHabit = makeHabit({ id: 'habit-2' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habit: newHabit }));

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await act(async () => {
        await result.current.createHabit({ name: 'New Habit' });
      });

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'habits-changed' }));
    });

    it('sets error and returns null when response is not ok', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({ error: 'Datos inválidos' }, false));

      let created: Habit | null = makeHabit();
      await act(async () => {
        created = await result.current.createHabit({ name: '' });
      });

      expect(created).toBeNull();
      expect(result.current.error).toBe('Datos inválidos');
    });

    it('uses fallback error message when error field is missing in error response', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      await act(async () => {
        await result.current.createHabit({ name: '' });
      });

      expect(result.current.error).toBe('Error al crear hábito');
    });

    it('sets error on network failure and returns null', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let created: Habit | null = makeHabit();
      await act(async () => {
        created = await result.current.createHabit({ name: 'Habit' });
      });

      expect(created).toBeNull();
      expect(result.current.error).toBe('Error de conexión');
    });
  });

  describe('updateHabit', () => {
    it('returns false when no session', async () => {
      setupNoSession();

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.updateHabit('habit-1', { name: 'Updated' });
      });

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('PATCHes the habit and updates state on success', async () => {
      setupAuthenticatedSession();
      const original = makeHabit({ id: 'habit-1', name: 'Original' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [original] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updated = makeHabit({ id: 'habit-1', name: 'Updated' });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ habit: updated }))
        .mockResolvedValueOnce(makeFetchResponse({ habits: [updated] }));

      let success = false;
      await act(async () => {
        success = await result.current.updateHabit('habit-1', { name: 'Updated' });
      });

      await waitFor(() => {
        expect(result.current.habits[0]?.name).toBe('Updated');
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();

      const updateCall = mockFetch.mock.calls[1];
      expect(updateCall[0]).toBe('/api/habits/habit-1');
      expect(updateCall[1]).toMatchObject({ method: 'PATCH' });
    });

    it('dispatches habits-changed event after successful update', async () => {
      setupAuthenticatedSession();
      const original = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [original] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updated = makeHabit({ id: 'habit-1', name: 'Updated' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habit: updated }));

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await act(async () => {
        await result.current.updateHabit('habit-1', { name: 'Updated' });
      });

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'habits-changed' }));
    });

    it('sets error and returns false when response is not ok', async () => {
      setupAuthenticatedSession();
      const original = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [original] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({ error: 'Not found' }, false));

      let success = true;
      await act(async () => {
        success = await result.current.updateHabit('habit-1', { name: 'X' });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Not found');
    });

    it('uses fallback error message when error field is missing in error response', async () => {
      setupAuthenticatedSession();
      const original = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [original] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      await act(async () => {
        await result.current.updateHabit('habit-1', { name: 'X' });
      });

      expect(result.current.error).toBe('Error al actualizar hábito');
    });

    it('sets error and returns false on network error', async () => {
      setupAuthenticatedSession();
      const original = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [original] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let success = true;
      await act(async () => {
        success = await result.current.updateHabit('habit-1', { name: 'X' });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Error de conexión');
    });
  });

  describe('deleteHabit', () => {
    it('returns false when no session', async () => {
      setupNoSession();

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success = true;
      await act(async () => {
        success = await result.current.deleteHabit('habit-1');
      });

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('removes the habit optimistically and sends DELETE request', async () => {
      setupAuthenticatedSession();
      const habit = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [habit] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, true));

      let success = false;
      await act(async () => {
        success = await result.current.deleteHabit('habit-1');
      });

      expect(success).toBe(true);
      expect(result.current.habits).toHaveLength(0);
      expect(result.current.error).toBeNull();

      const deleteCall = mockFetch.mock.calls[1];
      expect(deleteCall[0]).toBe('/api/habits/habit-1');
      expect(deleteCall[1]).toMatchObject({ method: 'DELETE' });
    });

    it('dispatches habits-changed event after successful delete', async () => {
      setupAuthenticatedSession();
      const habit = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [habit] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, true));

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await act(async () => {
        await result.current.deleteHabit('habit-1');
      });

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'habits-changed' }));
    });

    it('restores habits and sets error when delete response is not ok', async () => {
      setupAuthenticatedSession();
      const habit = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [habit] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      let success = true;
      await act(async () => {
        success = await result.current.deleteHabit('habit-1');
      });

      expect(success).toBe(false);
      expect(result.current.habits).toHaveLength(1);
      expect(result.current.habits[0].id).toBe('habit-1');
      expect(result.current.error).toBe('Error al eliminar hábito');
    });

    it('restores habits and sets error on network failure', async () => {
      setupAuthenticatedSession();
      const habit = makeHabit({ id: 'habit-1' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [habit] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let success = true;
      await act(async () => {
        success = await result.current.deleteHabit('habit-1');
      });

      expect(success).toBe(false);
      expect(result.current.habits).toHaveLength(1);
      expect(result.current.habits[0].id).toBe('habit-1');
      expect(result.current.error).toBe('Error de conexión');
    });

    it('only removes the matching habit when multiple exist', async () => {
      setupAuthenticatedSession();
      const habit1 = makeHabit({ id: 'habit-1', name: 'Habit One' });
      const habit2 = makeHabit({ id: 'habit-2', name: 'Habit Two' });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [habit1, habit2] }));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({}, true))
        .mockResolvedValueOnce(makeFetchResponse({ habits: [habit2] }));

      await act(async () => {
        await result.current.deleteHabit('habit-1');
      });

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1);
      });

      expect(result.current.habits[0].id).toBe('habit-2');
    });
  });

  describe('error state reset', () => {
    it('clears error on successful fetch after a prior error', async () => {
      setupAuthenticatedSession();
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      const { result } = renderHook(() => useHabits());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Error al cargar hábitos');

      mockFetch.mockResolvedValueOnce(makeFetchResponse({ habits: [] }));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
