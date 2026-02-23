'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useDailyPostStatus } from '@/hooks/useDailyPostStatus';

interface NotificationSettings {
  enabled: boolean;
  morningTime: string;
  nightTime: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  morningTime: "11:00",
  nightTime: "20:30"
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return navigatorWithStandalone.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export const useNotifications = () => {
  const { session } = useAuthSession();
  const { hasDayPost, hasNightPost, loading } = useDailyPostStatus();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPushRegistered, setIsPushRegistered] = useState(false);

  const initializationRef = useRef(false);
  const registrationTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout>>();
  const morningTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout>>();
  const nightTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout>>();
  const pushRegistrationRef = useRef<Promise<boolean> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  };

  const showNotification = useCallback((title: string, body: string, url?: string) => {
    if (permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'whisper-reminder',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        if (url) {
          window.location.href = url;
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    } catch {
      // Notification constructor not supported (e.g., iOS requires SW-based notifications)
    }
  }, [permission]);

  const clearScheduledNotifications = useCallback(() => {
    if (morningTimeoutRef.current) {
      clearTimeout(morningTimeoutRef.current);
      morningTimeoutRef.current = undefined;
    }
    if (nightTimeoutRef.current) {
      clearTimeout(nightTimeoutRef.current);
      nightTimeoutRef.current = undefined;
    }
  }, []);

  const scheduleNotifications = useCallback(() => {
    if (isPushRegistered) return;
    if (!session?.user?.id || permission !== 'granted' || !settings.enabled || loading) {
      return;
    }

    const now = new Date();
    const [morningHour, morningMin] = settings.morningTime.split(':').map(Number);
    const [nightHour, nightMin] = settings.nightTime.split(':').map(Number);

    const morningNotification = new Date(now);
    morningNotification.setHours(morningHour, morningMin, 0, 0);

    const nightNotification = new Date(now);
    nightNotification.setHours(nightHour, nightMin, 0, 0);

    if (now > morningNotification) {
      morningNotification.setDate(morningNotification.getDate() + 1);
    }
    if (now > nightNotification) {
      nightNotification.setDate(nightNotification.getDate() + 1);
    }

    clearScheduledNotifications();

    if (!hasDayPost) {
      const timeUntilMorning = morningNotification.getTime() - now.getTime();
      if (timeUntilMorning > 0) {
        morningTimeoutRef.current = globalThis.setTimeout(() => {
          showNotification(
            'Tiempo de tu Whisper matutino',
            'No olvides compartir tu whisper del día',
            '/create'
          );
        }, timeUntilMorning);
      }
    }

    if (!hasNightPost) {
      const timeUntilNight = nightNotification.getTime() - now.getTime();
      if (timeUntilNight > 0) {
        nightTimeoutRef.current = globalThis.setTimeout(() => {
          showNotification(
            'Tiempo de tu Whisper nocturno',
            'No olvides compartir tu whisper de la noche',
            '/create'
          );
        }, timeUntilNight);
      }
    }
  }, [isPushRegistered, session?.user?.id, permission, settings, hasDayPost, hasNightPost, loading, showNotification, clearScheduledNotifications]);

  const isPushSupported = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    if (isIOSDevice() && !isStandalonePWA()) {
      return false;
    }

    return true;
  }, []);

  const registerPushSubscription = useCallback(async (): Promise<boolean> => {
    if (isRegistering || pushRegistrationRef.current) {
      return await (pushRegistrationRef.current ?? Promise.resolve(false));
    }

    if (!isPushSupported()) return false;
    if (permission !== 'granted') return false;
    if (!session?.user?.id) return false;

    setIsRegistering(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const registrationPromise = (async (): Promise<boolean> => {
      try {
        const registration = await navigator.serviceWorker.ready;

        if (signal.aborted) return false;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidPublicKey) return false;

          if (signal.aborted) return false;

          const convertedVapidKey = new Uint8Array(
            atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/'))
              .split('')
              .map(char => char.charCodeAt(0))
          );

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        if (signal.aborted) return false;

        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        if (!p256dhKey || !authKey) return false;

        const subscriptionData = {
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey),
        };

        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0) {
          try {
            const response = await fetch('/api/notifications/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriptionData),
              signal,
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            return true;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');

            if (signal.aborted || lastError.name === 'AbortError') return false;

            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        throw lastError;

      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return false;
        }
        return false;
      } finally {
        setIsRegistering(false);
      }
    })();

    pushRegistrationRef.current = registrationPromise;
    const result = await registrationPromise;
    pushRegistrationRef.current = null;

    if (result) {
      setIsPushRegistered(true);
      clearScheduledNotifications();
    }

    return result;
  }, [isPushSupported, permission, session?.user?.id, isRegistering, clearScheduledNotifications]);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));

    if (registrationTimeoutRef.current) {
      clearTimeout(registrationTimeoutRef.current);
    }

    registrationTimeoutRef.current = setTimeout(() => {
      scheduleNotifications();
    }, 500);
  }, [settings, scheduleNotifications]);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // Corrupted settings, use defaults
      }
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!initializationRef.current) return;

    if (registrationTimeoutRef.current) {
      clearTimeout(registrationTimeoutRef.current);
    }

    registrationTimeoutRef.current = setTimeout(async () => {
      if (permission === 'granted' && session?.user?.id && !isRegistering) {
        const pushOk = await registerPushSubscription().catch(() => false);
        if (!pushOk) {
          scheduleNotifications();
        }
      } else {
        scheduleNotifications();
      }
    }, 1000);

    return () => {
      if (registrationTimeoutRef.current) {
        clearTimeout(registrationTimeoutRef.current);
      }
      clearScheduledNotifications();
    };
  }, [session?.user?.id, permission, settings, hasDayPost, hasNightPost, loading, scheduleNotifications, registerPushSubscription, clearScheduledNotifications, isRegistering]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (registrationTimeoutRef.current) {
        clearTimeout(registrationTimeoutRef.current);
      }
      clearScheduledNotifications();
    };
  }, [clearScheduledNotifications]);

  return {
    permission,
    settings,
    isRegistering,
    requestPermission,
    updateSettings,
    scheduleNotifications,
    clearScheduledNotifications,
    showNotification,
    registerPushSubscription,
  };
};
