'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { logger } from '@/lib/logger';

interface ReminderSettings {
  enabled: boolean;
  morningTime: string;
  nightTime: string;
  streakWarnings: boolean;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalPosts: number;
  lastPostDate: string | null;
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  morningTime: "10:00",
  nightTime: "21:30",
  streakWarnings: true
};

export const useReminderNotifications = () => {
  const { session } = useAuthSession();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [streakInfo, setStreakInfo] = useState<StreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
    totalPosts: 0,
    lastPostDate: null
  });
  const [loading, setLoading] = useState(false);
  const [nextReminder, setNextReminder] = useState<string | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('reminderSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_REMINDER_SETTINGS, ...parsed });
      } catch (error) {
        logger.error('Error parsing saved reminder settings', { error: String(error) });
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<ReminderSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('reminderSettings', JSON.stringify(updated));
  }, [settings]);

  // Calculate next reminder time
  const calculateNextReminder = useCallback(() => {
    if (!settings.enabled) {
      setNextReminder(null);
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [morningHour, morningMin] = settings.morningTime.split(':').map(Number);
    const [nightHour, nightMin] = settings.nightTime.split(':').map(Number);
    
    const morningTime = morningHour * 60 + morningMin;
    const nightTime = nightHour * 60 + nightMin;
    
    let nextTime: string;
    
    if (currentTime < morningTime) {
      nextTime = `${morningHour.toString().padStart(2, '0')}:${morningMin.toString().padStart(2, '0')}`;
    } else if (currentTime < nightTime) {
      nextTime = `${nightHour.toString().padStart(2, '0')}:${nightMin.toString().padStart(2, '0')}`;
    } else {
      // Tomorrow morning
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      nextTime = `Tomorrow ${morningHour.toString().padStart(2, '0')}:${morningMin.toString().padStart(2, '0')}`;
    }
    
    setNextReminder(nextTime);
  }, [settings.enabled, settings.morningTime, settings.nightTime]);

  // Update next reminder time when settings change
  useEffect(() => {
    calculateNextReminder();
  }, [calculateNextReminder]);

  // Fetch user's streak information
  const fetchStreakInfo = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      
      const response = await fetch('/api/user/streak', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStreakInfo(data);
      }
    } catch (error) {
      logger.error('Error fetching streak info', { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Fetch streak info when session changes
  useEffect(() => {
    fetchStreakInfo();
  }, [fetchStreakInfo]);

  // Check if user has posted today
  const checkTodayPosts = useCallback(async () => {
    if (!session?.user?.id) return { hasDayPost: false, hasNightPost: false };

    try {
      const response = await fetch('/api/user/today-posts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      logger.error('Error checking today posts', { error: String(error) });
    }

    return { hasDayPost: false, hasNightPost: false };
  }, [session?.user?.id]);

  // Get reminder status
  const getReminderStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/schedule-reminders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      logger.error('Error getting reminder status', { error: String(error) });
    }

    return null;
  }, []);

  // Test reminder notification
  const testReminder = useCallback(async (type: 'morning' | 'night' | 'streak') => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/notifications/test-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          userId: session.user.id
        }),
      });

      if (!response.ok) {
        logger.error('Test reminder request failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Error sending test reminder', { error: String(error) });
    }
  }, [session?.user?.id]);

  // Update reminder times
  const updateReminderTimes = useCallback((morningTime: string, nightTime: string) => {
    saveSettings({ morningTime, nightTime });
  }, [saveSettings]);

  // Toggle reminder settings
  const toggleReminderSetting = useCallback((setting: keyof ReminderSettings) => {
    saveSettings({ [setting]: !settings[setting] });
  }, [saveSettings, settings]);

  // Get formatted streak display
  const getStreakDisplay = useCallback(() => {
    if (streakInfo.currentStreak === 0) {
      return 'Sin racha';
    }
    
    if (streakInfo.currentStreak === 1) {
      return '1 día';
    }
    
    return `${streakInfo.currentStreak} días`;
  }, [streakInfo.currentStreak]);

  // Check if user is at risk of losing streak
  const isAtRiskOfLosingStreak = useCallback(async () => {
    if (streakInfo.currentStreak === 0) return false;
    
    const { hasDayPost, hasNightPost } = await checkTodayPosts();
    return !hasDayPost || !hasNightPost;
  }, [streakInfo.currentStreak, checkTodayPosts]);

  return {
    // State
    settings,
    streakInfo,
    loading,
    nextReminder,
    
    // Actions
    saveSettings,
    updateReminderTimes,
    toggleReminderSetting,
    fetchStreakInfo,
    checkTodayPosts,
    getReminderStatus,
    testReminder,
    
    // Computed
    getStreakDisplay,
    isAtRiskOfLosingStreak,
    
    // Constants
    DEFAULT_REMINDER_SETTINGS
  };
}; 