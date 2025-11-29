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

// Helper function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const useNotifications = () => {
  const { session } = useAuthSession();
  const { hasDayPost, hasNightPost, loading } = useDailyPostStatus();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Refs to prevent race conditions
  const initializationRef = useRef(false);
  const registrationTimeoutRef = useRef<NodeJS.Timeout>();
  const pushRegistrationRef = useRef<Promise<boolean> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Show notification with click handler
  const showNotification = useCallback((title: string, body: string, url?: string) => {
    console.log('[NOTIFICATION DEBUG] Attempting to show notification:', { title, body, url, permission });
    
    if (permission !== 'granted') {
      console.warn('[NOTIFICATION DEBUG] Cannot show notification - permission not granted');
      return;
    }

    try {
      console.log('[NOTIFICATION DEBUG] Creating notification...');
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'whisper-reminder',
        requireInteraction: true
      });

      console.log('[NOTIFICATION DEBUG] Notification created successfully:', notification);

      notification.onclick = () => {
        console.log('[NOTIFICATION DEBUG] Notification clicked, navigating to:', url);
        window.focus();
        if (url) {
          window.location.href = url;
        }
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => {
        console.log('[NOTIFICATION DEBUG] Auto-closing notification');
        notification.close();
      }, 10000);
      
      console.log('[NOTIFICATION DEBUG] Notification displayed successfully');
    } catch (error) {
      console.error('[NOTIFICATION DEBUG] Error showing notification:', error);
    }
  }, [permission]);

  // Schedule notifications based on current time and missing posts
  const scheduleNotifications = useCallback(() => {
    console.log('[NOTIFICATION DEBUG] Scheduling notifications...', {
      hasSession: !!session?.user?.id,
      permission,
      settingsEnabled: settings.enabled,
      loading,
      hasDayPost,
      hasNightPost,
      currentTime: new Date().toLocaleTimeString()
    });

    if (!session?.user?.id || permission !== 'granted' || !settings.enabled || loading) {
      console.log('[NOTIFICATION DEBUG] Skipping notification scheduling:', {
        reason: !session?.user?.id ? 'no-session' : 
                permission !== 'granted' ? 'no-permission' : 
                !settings.enabled ? 'disabled' : 'loading'
      });
      return;
    }

    const now = new Date();
    const [morningHour, morningMin] = settings.morningTime.split(':').map(Number);
    const [nightHour, nightMin] = settings.nightTime.split(':').map(Number);

    // Create notification times for today
    const morningNotification = new Date(now);
    morningNotification.setHours(morningHour, morningMin, 0, 0);

    const nightNotification = new Date(now);
    nightNotification.setHours(nightHour, nightMin, 0, 0);

    // If times have passed, schedule for tomorrow
    if (now > morningNotification) {
      morningNotification.setDate(morningNotification.getDate() + 1);
    }
    if (now > nightNotification) {
      nightNotification.setDate(nightNotification.getDate() + 1);
    }

    console.log('[NOTIFICATION DEBUG] Notification times:', {
      morning: morningNotification.toLocaleString(),
      night: nightNotification.toLocaleString(),
      now: now.toLocaleString()
    });

    // Clear existing timeouts
    clearScheduledNotifications();

    // Schedule morning notification if day post is missing
    if (!hasDayPost) {
      const timeUntilMorning = morningNotification.getTime() - now.getTime();
      console.log('[NOTIFICATION DEBUG] Morning notification timing:', {
        timeUntilMorning: Math.round(timeUntilMorning / 1000 / 60) + ' minutes',
        willSchedule: timeUntilMorning > 0
      });
      
      if (timeUntilMorning > 0) {
        const timeoutId = setTimeout(() => {
          console.log('[NOTIFICATION DEBUG] Showing morning notification');
          showNotification(
            '🌅 Tiempo de tu Whisper matutino',
            'No olvides compartir tu whisper del día',
            '/create'
          );
        }, timeUntilMorning);
        
        localStorage.setItem('morningNotificationId', timeoutId.toString());
        console.log('[NOTIFICATION DEBUG] Morning notification scheduled with ID:', timeoutId);
      }
    } else {
      console.log('[NOTIFICATION DEBUG] Morning notification skipped - day post exists');
    }

    // Schedule night notification if night post is missing
    if (!hasNightPost) {
      const timeUntilNight = nightNotification.getTime() - now.getTime();
      console.log('[NOTIFICATION DEBUG] Night notification timing:', {
        timeUntilNight: Math.round(timeUntilNight / 1000 / 60) + ' minutes',
        willSchedule: timeUntilNight > 0
      });
      
      if (timeUntilNight > 0) {
        const timeoutId = setTimeout(() => {
          console.log('[NOTIFICATION DEBUG] Showing night notification');
          showNotification(
            '🌙 Tiempo de tu Whisper nocturno',
            'No olvides compartir tu whisper de la noche',
            '/create'
          );
        }, timeUntilNight);
        
        localStorage.setItem('nightNotificationId', timeoutId.toString());
        console.log('[NOTIFICATION DEBUG] Night notification scheduled with ID:', timeoutId);
      }
    } else {
      console.log('[NOTIFICATION DEBUG] Night notification skipped - night post exists');
    }
  }, [session?.user?.id, permission, settings, hasDayPost, hasNightPost, loading, showNotification]);

  // Clear scheduled notifications
  const clearScheduledNotifications = useCallback(() => {
    const morningId = localStorage.getItem('morningNotificationId');
    const nightId = localStorage.getItem('nightNotificationId');
    
    if (morningId) {
      clearTimeout(Number(morningId));
      localStorage.removeItem('morningNotificationId');
    }
    
    if (nightId) {
      clearTimeout(Number(nightId));
      localStorage.removeItem('nightNotificationId');
    }
  }, []);

  // Check if push notifications are fully supported
  const isPushSupported = useCallback((): boolean => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    // Check for iOS Safari specific limitations
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
    const isIOSFirefox = isIOS && /FxiOS/.test(navigator.userAgent);
    
    if (isIOS && !isIOSChrome && !isIOSFirefox) {
      const isStandalone = (window.navigator as any).standalone === true;
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      if (!isStandalone && !isDisplayStandalone) {
        console.warn('iOS Safari requires PWA mode for push notifications');
        return false;
      }
    }

    return true;
  }, []);

  // Register push subscription with proper error handling and debouncing
  const registerPushSubscription = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent registrations
    if (isRegistering || pushRegistrationRef.current) {
      console.log('[PUSH DEBUG] Registration already in progress, skipping...');
      return await (pushRegistrationRef.current || Promise.resolve(false));
    }

    if (!isPushSupported()) {
      console.warn('Push messaging is not supported on this platform');
      return false;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    if (!session?.user?.id) {
      console.warn('No authenticated user for push registration');
      return false;
    }

    setIsRegistering(true);
    
    // Create a new AbortController for this registration attempt
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const registrationPromise = (async (): Promise<boolean> => {
      try {
        console.log('[PUSH DEBUG] Starting push subscription registration...');
        
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;
        console.log('[PUSH DEBUG] Service worker ready');

        if (signal.aborted) {
          console.log('[PUSH DEBUG] Registration aborted');
          return false;
        }

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();
        console.log('[PUSH DEBUG] Existing subscription:', subscription ? 'Found' : 'None');
        
        if (!subscription) {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidPublicKey) {
            console.error('[PUSH DEBUG] VAPID public key not configured');
            return false;
          }

          if (signal.aborted) {
            console.log('[PUSH DEBUG] Registration aborted before subscription');
            return false;
          }

          // Convert VAPID key
          const convertedVapidKey = new Uint8Array(
            atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/'))
              .split('')
              .map(char => char.charCodeAt(0))
          );

          console.log('[PUSH DEBUG] Subscribing to push manager...');
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
          console.log('[PUSH DEBUG] Push subscription created successfully');
        }

        if (signal.aborted) {
          console.log('[PUSH DEBUG] Registration aborted before server call');
          return false;
        }

        // Send subscription to server with timeout and retry logic
        const subscriptionData = {
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        };

        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0) {
          try {
            console.log('[PUSH DEBUG] Sending subscription to server (attempt:', 4 - retries, ')');
            
            const response = await fetch('/api/notifications/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriptionData),
              signal: signal // Add AbortController signal
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            console.log('[PUSH DEBUG] Push subscription registered successfully');
            return true;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            
            if (signal.aborted || lastError.name === 'AbortError') {
              console.log('[PUSH DEBUG] Registration aborted');
              return false;
            }

            retries--;
            if (retries > 0) {
              console.log(`[PUSH DEBUG] Registration failed, retrying in 2s... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        console.error('[PUSH DEBUG] All registration attempts failed:', lastError);
        throw lastError;

      } catch (error) {
        if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          console.log('[PUSH DEBUG] Registration aborted');
          return false;
        }
        
        console.error('[PUSH DEBUG] Error registering push subscription:', error);
        return false;
      } finally {
        setIsRegistering(false);
      }
    })();

    pushRegistrationRef.current = registrationPromise;
    const result = await registrationPromise;
    pushRegistrationRef.current = null;
    
    return result;
  }, [isPushSupported, permission, session?.user?.id]);

  // Update settings with debouncing
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));
    
    // Clear existing timeout
    if (registrationTimeoutRef.current) {
      clearTimeout(registrationTimeoutRef.current);
    }
    
    // Debounce the rescheduling
    registrationTimeoutRef.current = setTimeout(() => {
      scheduleNotifications();
    }, 500);
  }, [settings, scheduleNotifications]);

  // Initialize settings once
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.warn('Failed to parse notification settings');
      }
    }

    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Handle permission and session changes with debouncing
  useEffect(() => {
    if (!initializationRef.current) return;
    
    // Clear existing timeout
    if (registrationTimeoutRef.current) {
      clearTimeout(registrationTimeoutRef.current);
    }

    // Debounce the operations
    registrationTimeoutRef.current = setTimeout(() => {
      scheduleNotifications();
      
      // Register push subscription when conditions are met
      if (permission === 'granted' && session?.user?.id && !isRegistering) {
        registerPushSubscription().catch(error => {
          console.error('Push registration failed:', error);
        });
      }
    }, 1000);

    // Cleanup function
    return () => {
      if (registrationTimeoutRef.current) {
        clearTimeout(registrationTimeoutRef.current);
      }
      clearScheduledNotifications();
    };
  }, [session?.user?.id, permission, settings, hasDayPost, hasNightPost, loading, scheduleNotifications, registerPushSubscription, clearScheduledNotifications, isRegistering]);

  // Cleanup on unmount
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

  // Test notification function for debugging
  const testNotification = useCallback(async () => {
    console.log('[NOTIFICATION DEBUG] Testing notification system...');
    
    try {
      const response = await fetch('/api/debug/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          title: '🧪 Test Notification',
          body: 'Esta es una notificación de prueba del sistema'
        })
      });
      
      if (response.ok) {
        console.log('[NOTIFICATION DEBUG] Test notification API call successful');
        // Show the test notification immediately
        showNotification(
          '🧪 Test Notification',
          'Esta es una notificación de prueba del sistema',
          '/feed'
        );
      } else {
        console.error('[NOTIFICATION DEBUG] Test notification API call failed:', response.status);
      }
    } catch (error) {
      console.error('[NOTIFICATION DEBUG] Error testing notification:', error);
    }
  }, [showNotification]);

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
    testNotification
  };
};