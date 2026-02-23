import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseAuthSession = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const mockLoggerError = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: mockLoggerError,
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/utils/format-utils', () => ({
  formatLikeCount: (count: number) => String(count),
}));

import LikeButton from '../LikeButton';

const makeFetchResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);

describe('LikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    mockFetch.mockResolvedValue(makeFetchResponse({ liked: false, count: 0 }));
  });

  describe('rendering', () => {
    it('renders with default state (unliked)', async () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button', { name: /dar me gusta/i })).toBeInTheDocument();
    });

    it('renders liked aria-label when initialLiked is true', async () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" initialLiked={true} />);
      expect(screen.getByRole('button', { name: /quitar me gusta/i })).toBeInTheDocument();
    });

    it('displays initial like count', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" initialLikeCount={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('displays zero when no initialLikeCount provided', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('is disabled when not authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is enabled when authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('applies cursor-not-allowed class when not authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button')).toHaveClass('cursor-not-allowed');
    });

    it('applies cursor-pointer class when authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button')).toHaveClass('cursor-pointer');
    });

    it('applies additional className to wrapper div', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      const { container } = render(<LikeButton entryId="entry-123" className="my-class" />);
      expect(container.firstChild).toHaveClass('my-class');
    });
  });

  describe('unauthenticated interaction', () => {
    it('button is disabled so no API call happens when not authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      mockFetch.mockClear();
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button')).toBeDisabled();
      const likeCalls = mockFetch.mock.calls.filter(([url]: [string]) => url === '/api/likes');
      expect(likeCalls).toHaveLength(0);
    });

    it('shows tooltip indicating login required when not authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Inicia sesión para dar me gusta');
    });
  });

  describe('temp entry protection', () => {
    it('shows error message when entry id starts with temp-', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch.mockResolvedValue(makeFetchResponse({ liked: false, count: 0 }));
      render(<LikeButton entryId="temp-1234567890" />);
      await user.click(screen.getByRole('button'));
      expect(screen.getByText(/aún se está guardando/i)).toBeInTheDocument();
    });
  });

  describe('authenticated like toggle', () => {
    it('toggles like state to liked on successful API response', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 0 }))
        .mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 1 }));

      render(<LikeButton entryId="entry-abc" initialLiked={false} initialLikeCount={0} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /dar me gusta/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /quitar me gusta/i })).toBeInTheDocument();
      });
    });

    it('increments like count after liking', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 5 }))
        .mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 5 }));

      render(<LikeButton entryId="entry-abc" initialLiked={false} initialLikeCount={5} />);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument();
      });
    });

    it('decrements like count after unliking', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 3 }))
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 3 }));

      render(<LikeButton entryId="entry-abc" initialLiked={true} initialLikeCount={3} />);

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button', { name: /quitar me gusta/i }));

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('calls fetch with POST method and correct body', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 0 }))
        .mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 1 }));

      render(<LikeButton entryId="entry-xyz" initialLiked={false} initialLikeCount={0} />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button'));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      const [url, options] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url).toBe('/api/likes');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body as string)).toEqual({ entryId: 'entry-xyz' });
    });

    it('shows error message when API call fails', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 0 }))
        .mockResolvedValueOnce(makeFetchResponse({ error: 'Server error' }, false));

      render(<LikeButton entryId="entry-abc" initialLiked={false} />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/error al procesar/i)).toBeInTheDocument();
      });
    });

    it('logs error when API call fails', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 0 }))
        .mockResolvedValueOnce(makeFetchResponse({ error: 'Server error' }, false));

      render(<LikeButton entryId="entry-abc" initialLiked={false} />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalled();
      });
    });

    it('does not go below zero on count decrement', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 0 }))
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 0 }));

      render(<LikeButton entryId="entry-abc" initialLiked={true} initialLikeCount={0} />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button', { name: /quitar me gusta/i }));

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables button while request is in flight', async () => {
      const user = userEvent.setup();
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });

      let resolveFetch!: (value: Response) => void;
      const pendingFetch = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      mockFetch
        .mockResolvedValueOnce(makeFetchResponse({ liked: false, count: 0 }))
        .mockReturnValueOnce(pendingFetch);

      render(<LikeButton entryId="entry-abc" initialLiked={false} />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toBeDisabled();

      await act(async () => {
        resolveFetch(makeFetchResponse({ liked: true, count: 1 }) as unknown as Response);
        await Promise.resolve();
      });
    });
  });

  describe('initial like status fetch', () => {
    it('fetches like status on mount when authenticated', async () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 7 }));

      render(<LikeButton entryId="entry-fetch-test" initialLiked={false} initialLikeCount={0} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/likes/status?entryId=entry-fetch-test');
      });
    });

    it('updates state from fetched like status', async () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({ liked: true, count: 7 }));

      render(<LikeButton entryId="entry-fetch-test" initialLiked={false} initialLikeCount={0} />);

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /quitar me gusta/i })).toBeInTheDocument();
    });

    it('does not fetch like status when not authenticated', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      mockFetch.mockClear();

      render(<LikeButton entryId="entry-no-fetch" />);

      const statusCalls = mockFetch.mock.calls.filter(([url]: [string]) =>
        url?.includes('/api/likes/status')
      );
      expect(statusCalls).toHaveLength(0);
    });

    it('logs error when status fetch fails and uses initial values', async () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: true });
      mockFetch.mockResolvedValueOnce(makeFetchResponse({}, false));

      render(<LikeButton entryId="entry-fail" initialLiked={false} initialLikeCount={5} />);

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith('Error fetching like status', expect.anything());
      });

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('isDay prop', () => {
    it('renders without errors when isDay is false', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" isDay={false} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders without errors when isDay is true (default)', () => {
      mockUseAuthSession.mockReturnValue({ isAuthenticated: false });
      render(<LikeButton entryId="entry-123" isDay={true} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
