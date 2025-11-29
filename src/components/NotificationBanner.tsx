'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';

const DISMISSED_KEY = 'notificationBannerDismissed';

export default function NotificationBanner() {
  const { session } = useAuthSession();
  const { isDay } = useTheme();
  const { permission, requestPermission, registerPushSubscription } = useNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    if (wasDismissed) return;

    if (Notification.permission === 'default') {
      setDismissed(false);
    }
  }, [session?.user?.id]);

  if (dismissed || !session?.user?.id || permission !== 'default') {
    return null;
  }

  const handleEnable = async () => {
    setRequesting(true);
    const granted = await requestPermission();
    if (granted) {
      await registerPushSubscription();
    }
    setDismissed(true);
    setRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  return (
    <div style={{ top: 'calc(env(safe-area-inset-top, 16px) + 8px)' }} className={`fixed inset-x-4 max-w-md mx-auto z-[60] rounded-xl shadow-lg p-4 ${
      isDay
        ? 'bg-[#F5F0E1] border border-[#4A2E1B]/20'
        : 'bg-[#2D1E1A] border border-[#F5F0E1]/20'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
            Activar notificaciones
          </p>
          <p className={`text-xs mt-0.5 ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            Recibe avisos de likes, seguidores y recordatorios
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleEnable}
          disabled={requesting}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            requesting ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isDay
              ? 'bg-[#4A2E1B] text-[#F5F0E1]'
              : 'bg-[#F5F0E1] text-[#2D1E1A]'
          }`}
        >
          {requesting ? 'Activando...' : 'Activar'}
        </button>
        <button
          onClick={handleDismiss}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDay
              ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
              : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
          }`}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
