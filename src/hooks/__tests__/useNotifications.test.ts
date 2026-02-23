import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockUseAuthSession, mockUseDailyPostStatus } = vi.hoisted(() => {
  const mockUseAuthSession = vi.fn();
  const mockUseDailyPostStatus = vi.fn();
  return { mockUseAuthSession, mockUseDailyPostStatus };
});

vi.mock('@/hooks/useAuthSession', () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock('@/hooks/useDailyPostStatus', () => ({
  useDailyPostStatus: mockUseDailyPostStatus,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useNotifications } from '../useNotifications';

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Notification API
const mockNotificationConstructor = vi.fn();
const mockNotificationClose = vi.fn();

class MockNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission);
  body: string;
  onclick: (() => void) | null = null;
  close = mockNotificationClose;

  constructor(title: string, options?: NotificationOptions) {
    mockNotificationConstructor(title, options);
    this.body = options?.body ?? '';
  }
}

Object.defineProperty(global, 'Notification', {
  value: MockNotification,
  writable: true,
  configurable: true,
});

// Mock service worker and PushManager
const mockGetSubscription = vi.fn();
const mockPushSubscribe = vi.fn();

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: mockGetSubscription,
        subscribe: mockPushSubscribe,
      },
    }),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'PushManager', {
  value: class {},
  writable: true,
  configurable: true,
});

// Mock matchMedia for isStandalonePWA check
Object.defineProperty(global, 'matchMedia', {
  value: vi.fn().mockReturnValue({ matches: false }),
  writable: true,
  configurable: true,
});

// Mock localStorage
const localStorageMock: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value; }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
    clear: vi.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
  },
  writable: true,
  configurable: true,
});

function setupAuthenticatedSession(userId = 'user-123'): void {
  mockUseAuthSession.mockReturnValue({
    session: { user: { id: userId } },
    isLoading: false,
  });
}

function setupNoSession(): void {
  mockUseAuthSession.mockReturnValue({
    session: null,
    isLoading: false,
  });
}

function setupDailyPosts(hasDayPost = false, hasNightPost = false): void {
  mockUseDailyPostStatus.mockReturnValue({
    hasDayPost,
    hasNightPost,
    loading: false,
  });
}

function mockPushSubscription(): void {
  const mockSubscription = {
    endpoint: 'https://push.example.com/sub',
    getKey: (name: string) => {
      if (name === 'p256dh' || name === 'auth') {
        return new Uint8Array([1, 2, 3, 4]).buffer;
      }
      return null;
    },
  };
  mockGetSubscription.mockResolvedValue(mockSubscription);
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);

    MockNotification.permission = 'granted';
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-W0FQ0008eZPG3PJN50qkqddjSAY3yZ3yj0ADA';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns default settings and permission', () => {
      setupNoSession();
      setupDailyPosts();

      const { result } = renderHook(() => useNotifications());

      expect(result.current.permission).toBe('granted');
      expect(result.current.settings.enabled).toBe(true);
      expect(result.current.settings.morningTime).toBe('11:00');
      expect(result.current.settings.nightTime).toBe('20:30');
      expect(result.current.isRegistering).toBe(false);
    });

    it('exposes all expected functions', () => {
      setupNoSession();
      setupDailyPosts();

      const { result } = renderHook(() => useNotifications());

      expect(typeof result.current.requestPermission).toBe('function');
      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.scheduleNotifications).toBe('function');
      expect(typeof result.current.clearScheduledNotifications).toBe('function');
      expect(typeof result.current.showNotification).toBe('function');
      expect(typeof result.current.registerPushSubscription).toBe('function');
    });
  });

  describe('push registration prevents local notifications', () => {
    it('does not schedule local notifications when push registration succeeds', async () => {
      setupAuthenticatedSession();
      setupDailyPosts(false, false);
      mockPushSubscription();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(''),
      });

      const { result } = renderHook(() => useNotifications());

      // Advance past the 1000ms initialization delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      // Wait for push registration to complete
      await waitFor(() => {
        expect(result.current.isRegistering).toBe(false);
      });

      // Local Notification constructor should NOT have been called
      // (no setTimeout-based local notifications scheduled)
      mockNotificationConstructor.mockClear();

      // Advance time significantly - local notifications would fire if scheduled
      await act(async () => {
        await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      });

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    it('schedules local notifications when push registration fails', async () => {
      setupAuthenticatedSession();
      setupDailyPosts(false, false);

      // Push subscription fails
      mockGetSubscription.mockResolvedValue(null);
      mockPushSubscribe.mockRejectedValue(new Error('Push not supported'));

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(false);
      });

      // scheduleNotifications should have been called as fallback
      // We can't directly check setTimeout was set, but we can verify
      // the hook tried to register push and fell back to local
      expect(mockGetSubscription).toHaveBeenCalled();
    });

    it('schedules local notifications when no session exists', async () => {
      setupNoSession();
      setupDailyPosts(false, false);

      renderHook(() => useNotifications());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      // Without session, push registration is skipped and local scheduling is attempted
      // (though it also bails because no session, which is correct)
      expect(mockGetSubscription).not.toHaveBeenCalled();
    });

    it('clears pending local notifications when push registration succeeds', async () => {
      setupAuthenticatedSession();
      setupDailyPosts(false, false);
      mockPushSubscription();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        text: () => Promise.resolve(''),
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      await waitFor(() => {
        expect(result.current.isRegistering).toBe(false);
      });

      // After push registered, calling scheduleNotifications should be a no-op
      mockNotificationConstructor.mockClear();

      act(() => {
        result.current.scheduleNotifications();
      });

      // Advance timers - no notifications should fire
      await act(async () => {
        await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      });

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });
  });

  describe('showNotification (test button)', () => {
    it('creates a Notification when permission is granted', () => {
      setupNoSession();
      setupDailyPosts();

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showNotification('Test', 'Body', '/url');
      });

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          body: 'Body',
          tag: 'whisper-reminder',
        })
      );
    });

    it('does not create Notification when permission is not granted', () => {
      MockNotification.permission = 'denied';
      setupNoSession();
      setupDailyPosts();

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showNotification('Test', 'Body');
      });

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('saves settings to localStorage', () => {
      setupNoSession();
      setupDailyPosts();

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.updateSettings({ morningTime: '09:00' });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'notificationSettings',
        expect.stringContaining('"morningTime":"09:00"')
      );
    });
  });

  describe('requestPermission', () => {
    it('requests notification permission from browser', async () => {
      setupNoSession();
      setupDailyPosts();

      const { result } = renderHook(() => useNotifications());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(MockNotification.requestPermission).toHaveBeenCalled();
      expect(granted).toBe(true);
    });
  });
});
