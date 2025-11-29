import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationPreferences } from '../useNotificationPreferences';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockFetchResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
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

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches preferences on mount', async () => {
    const prefs = { like: false, follow: false };
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: prefs }));

    const { result } = renderHook(() => useNotificationPreferences());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preferences).toEqual(prefs);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/user/notification-preferences',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('sets error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({}, false, 500));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Error al cargar preferencias');
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Error al cargar preferencias');
  });

  it('isEnabled returns true for missing keys (default enabled)', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: { like: false } }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEnabled('like')).toBe(false);
    expect(result.current.isEnabled('follow')).toBe(true);
    expect(result.current.isEnabled('chat')).toBe(true);
  });

  it('updatePreference performs optimistic update and saves', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: { like: false } }));

    await act(async () => {
      await result.current.updatePreference('like', false);
    });

    expect(result.current.isEnabled('like')).toBe(false);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const putCall = mockFetch.mock.calls[1];
    expect(putCall[1].method).toBe('PUT');
    const putBody = JSON.parse(putCall[1].body as string);
    expect(putBody.preferences).toEqual({ like: false });
  });

  it('reverts on save failure', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce(mockFetchResponse({}, false, 500));

    await act(async () => {
      await result.current.updatePreference('like', false);
    });

    expect(result.current.isEnabled('like')).toBe(true);
    expect(result.current.error).toBe('Error al guardar preferencias');
  });

  it('isCategoryFullyEnabled returns true when all types in category are enabled', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isCategoryFullyEnabled('social')).toBe(true);
  });

  it('isCategoryFullyEnabled returns false when any type in category is disabled', async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ preferences: { like: false } })
    );

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isCategoryFullyEnabled('social')).toBe(false);
  });

  it('isCategoryPartiallyEnabled returns true when some but not all are disabled', async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ preferences: { like: false } })
    );

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isCategoryPartiallyEnabled('social')).toBe(true);
  });

  it('isCategoryPartiallyEnabled returns false when all are enabled', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isCategoryPartiallyEnabled('social')).toBe(false);
  });

  it('toggleCategory disables all types when all are enabled', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({
        preferences: { like: false, follow: false, follow_post: false, chat: false },
      })
    );

    await act(async () => {
      await result.current.toggleCategory('social');
    });

    expect(result.current.isEnabled('like')).toBe(false);
    expect(result.current.isEnabled('follow')).toBe(false);
    expect(result.current.isEnabled('follow_post')).toBe(false);
    expect(result.current.isEnabled('chat')).toBe(false);
  });

  it('toggleCategory enables all types when some are disabled', async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse({ preferences: { like: false, follow: false } })
    );

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    await act(async () => {
      await result.current.toggleCategory('social');
    });

    expect(result.current.isEnabled('like')).toBe(true);
    expect(result.current.isEnabled('follow')).toBe(true);
  });

  it('toggleCategory reverts on save failure', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce(mockFetchResponse({}, false, 500));

    await act(async () => {
      await result.current.toggleCategory('social');
    });

    expect(result.current.isEnabled('like')).toBe(true);
    expect(result.current.isEnabled('follow')).toBe(true);
  });

  it('returns true for unknown category in isCategoryFullyEnabled', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isCategoryFullyEnabled('nonexistent')).toBe(true);
  });

  it('returns false for unknown category in isCategoryPartiallyEnabled', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse({ preferences: {} }));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isCategoryPartiallyEnabled('nonexistent')).toBe(false);
  });
});
