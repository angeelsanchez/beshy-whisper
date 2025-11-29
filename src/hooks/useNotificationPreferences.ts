'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NOTIFICATION_CATEGORIES } from '@/types/notification-preferences';
import type { NotificationType } from '@/types/notification-preferences';

type PreferencesMap = Record<string, boolean>;

interface NotificationPreferencesState {
  preferences: PreferencesMap;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export function useNotificationPreferences() {
  const [state, setState] = useState<NotificationPreferencesState>({
    preferences: {},
    loading: true,
    saving: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchPreferences = async () => {
      try {
        const res = await fetch('/api/user/notification-preferences', {
          signal: controller.signal,
        });

        if (!res.ok) {
          setState(prev => ({ ...prev, loading: false, error: 'Error al cargar preferencias' }));
          return;
        }

        const data = await res.json();
        setState(prev => ({
          ...prev,
          preferences: data.preferences ?? {},
          loading: false,
        }));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setState(prev => ({ ...prev, loading: false, error: 'Error al cargar preferencias' }));
        }
      }
    };

    fetchPreferences();

    return () => controller.abort();
  }, []);

  const isEnabled = useCallback(
    (type: NotificationType): boolean => {
      const value = state.preferences[type];
      return value === undefined || value === true;
    },
    [state.preferences]
  );

  const savePreferences = useCallback(async (updated: PreferencesMap): Promise<boolean> => {
    setState(prev => ({ ...prev, saving: true, error: null }));

    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updated }),
      });

      if (!res.ok) {
        setState(prev => ({ ...prev, saving: false, error: 'Error al guardar preferencias' }));
        return false;
      }

      const data = await res.json();
      setState(prev => ({
        ...prev,
        preferences: data.preferences ?? {},
        saving: false,
      }));
      return true;
    } catch {
      setState(prev => ({ ...prev, saving: false, error: 'Error al guardar preferencias' }));
      return false;
    }
  }, []);

  const updatePreference = useCallback(
    async (type: NotificationType, enabled: boolean) => {
      const previousPrefs = { ...state.preferences };

      setState(prev => ({
        ...prev,
        preferences: { ...prev.preferences, [type]: enabled },
      }));

      const success = await savePreferences({ [type]: enabled });
      if (!success) {
        setState(prev => ({ ...prev, preferences: previousPrefs }));
      }
    },
    [state.preferences, savePreferences]
  );

  const isCategoryFullyEnabled = useCallback(
    (categoryId: string): boolean => {
      const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);
      if (!category) return true;
      return category.types.every(t => isEnabled(t.type));
    },
    [isEnabled]
  );

  const isCategoryPartiallyEnabled = useCallback(
    (categoryId: string): boolean => {
      const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);
      if (!category) return false;
      const enabledCount = category.types.filter(t => isEnabled(t.type)).length;
      return enabledCount > 0 && enabledCount < category.types.length;
    },
    [isEnabled]
  );

  const toggleCategory = useCallback(
    async (categoryId: string) => {
      const category = NOTIFICATION_CATEGORIES.find(c => c.id === categoryId);
      if (!category) return;

      const allEnabled = isCategoryFullyEnabled(categoryId);
      const newValue = !allEnabled;

      const previousPrefs = { ...state.preferences };
      const updates: PreferencesMap = {};
      for (const t of category.types) {
        updates[t.type] = newValue;
      }

      setState(prev => ({
        ...prev,
        preferences: { ...prev.preferences, ...updates },
      }));

      const success = await savePreferences(updates);
      if (!success) {
        setState(prev => ({ ...prev, preferences: previousPrefs }));
      }
    },
    [state.preferences, isCategoryFullyEnabled, savePreferences]
  );

  return {
    preferences: state.preferences,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    isEnabled,
    updatePreference,
    isCategoryFullyEnabled,
    isCategoryPartiallyEnabled,
    toggleCategory,
  };
}
