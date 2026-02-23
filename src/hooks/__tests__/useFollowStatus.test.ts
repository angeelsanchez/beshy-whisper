import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockUseAuthSession } = vi.hoisted(() => {
  const mockUseAuthSession = vi.fn();
  return { mockUseAuthSession };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: mockUseAuthSession,
}));

import { useFollowStatus } from '../useFollowStatus';

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

function setupLoadingSession() {
  mockUseAuthSession.mockReturnValue({
    session: null,
    isLoading: true,
  });
}

describe('useFollowStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with isFollowing false, loading true, toggling false', () => {
      setupLoadingSession();

      const { result } = renderHook(() => useFollowStatus('target-456'));

      expect(result.current.isFollowing).toBe(false);
      expect(result.current.loading).toBe(true);
      expect(result.current.toggling).toBe(false);
    });

    it('exposes toggleFollow function', () => {
      setupLoadingSession();

      const { result } = renderHook(() => useFollowStatus('target-456'));

      expect(typeof result.current.toggleFollow).toBe('function');
    });
  });

  describe('when session is loading', () => {
    it('does not fetch and keeps loading true', async () => {
      setupLoadingSession();

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('when no user is logged in', () => {
    it('sets loading to false without fetching', async () => {
      setupNoSession();

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('isSelf is false', async () => {
      setupNoSession();

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isSelf).toBe(false);
    });
  });

  describe('when targetUserId is undefined', () => {
    it('sets loading to false without fetching', async () => {
      setupAuthenticatedSession();

      const { result } = renderHook(() => useFollowStatus(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('when viewing self', () => {
    it('sets loading to false, does not fetch, isSelf is true', async () => {
      setupAuthenticatedSession('user-123');

      const { result } = renderHook(() => useFollowStatus('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isSelf).toBe(true);
    });
  });

  describe('fetches follow status on mount', () => {
    it('calls the status API with targetUserId', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: true }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/follows/status?targetUserId=target-456',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('sets isFollowing to true when API returns true', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: true }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(true);
    });

    it('sets isFollowing to false when API returns false', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(false);
    });

    it('does not fetch twice for the same targetUserId', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValue(makeFetchResponse({ isFollowing: false }));

      const { result, rerender } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      rerender();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('handles API errors', () => {
    it('sets loading to false when response is not ok', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(false);
    });

    it('sets loading to false on network error', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isFollowing).toBe(false);
    });

    it('does not update state on AbortError', async () => {
      setupAuthenticatedSession('user-123');
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(result.current.isFollowing).toBe(false);
    });
  });

  describe('toggleFollow', () => {
    it('optimistically updates isFollowing to true when not following', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveToggle!: (value: Response) => void;
      const pendingPromise = new Promise<Response>(resolve => {
        resolveToggle = resolve;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      await act(async () => {
        void result.current.toggleFollow();
      });

      expect(result.current.toggling).toBe(true);
      expect(result.current.isFollowing).toBe(true);

      resolveToggle(makeFetchResponse({ isFollowing: true }));
      await waitFor(() => expect(result.current.toggling).toBe(false));
    });

    it('optimistically updates isFollowing to false when following', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: true }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveToggle!: (value: Response) => void;
      const pendingPromise = new Promise<Response>(resolve => {
        resolveToggle = resolve;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      await act(async () => {
        void result.current.toggleFollow();
      });

      expect(result.current.toggling).toBe(true);
      expect(result.current.isFollowing).toBe(false);

      resolveToggle(makeFetchResponse({ isFollowing: false }));
      await waitFor(() => expect(result.current.toggling).toBe(false));
    });

    it('sets toggling to false after successful toggle', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: true }));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(result.current.toggling).toBe(false);
      expect(result.current.isFollowing).toBe(true);
    });

    it('calls POST /api/follows with targetUserId', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: true }));

      await act(async () => {
        await result.current.toggleFollow();
      });

      const toggleCall = mockFetch.mock.calls[1];
      expect(toggleCall[0]).toBe('/api/follows');
      expect(toggleCall[1]).toMatchObject({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = JSON.parse(toggleCall[1].body as string) as { targetUserId: string };
      expect(body.targetUserId).toBe('target-456');
    });

    it('reverts isFollowing on failed toggle response', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(false);
      expect(result.current.toggling).toBe(false);
    });

    it('reverts isFollowing on network error during toggle', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(false);
      expect(result.current.toggling).toBe(false);
    });

    it('does nothing when no session', async () => {
      setupNoSession();

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does nothing when viewing self', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('user-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callsBefore = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockFetch.mock.calls.length).toBe(callsBefore);
    });

    it('does nothing when already toggling', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ isFollowing: false }));

      const { result } = renderHook(() => useFollowStatus('target-456'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveToggle!: (value: Response) => void;
      const pendingPromise = new Promise<Response>(resolve => {
        resolveToggle = resolve;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      act(() => {
        void result.current.toggleFollow();
      });

      expect(result.current.toggling).toBe(true);

      const callsBefore = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockFetch.mock.calls.length).toBe(callsBefore);

      resolveToggle(makeFetchResponse({ isFollowing: true }));

      await waitFor(() => {
        expect(result.current.toggling).toBe(false);
      });
    });
  });

  describe('targetUserId change', () => {
    it('resets fetch flag when targetUserId changes and fetches again', async () => {
      setupAuthenticatedSession('user-123');
      mockFetch.mockResolvedValue(makeFetchResponse({ isFollowing: false }));

      const { result, rerender } = renderHook(
        ({ target }: { target: string }) => useFollowStatus(target),
        { initialProps: { target: 'target-456' } },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      rerender({ target: 'target-789' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
