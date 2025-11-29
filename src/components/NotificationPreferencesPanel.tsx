'use client';

import { Users, Bell, Flag, Trophy, Loader2, type LucideIcon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { NOTIFICATION_CATEGORIES } from '@/types/notification-preferences';
import type { NotificationType } from '@/types/notification-preferences';

const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = {
  Users,
  Bell,
  Flag,
  Trophy,
};

interface ToggleSwitchProps {
  readonly enabled: boolean;
  readonly onChange: () => void;
  readonly disabled: boolean;
  readonly indeterminate?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled, indeterminate }: ToggleSwitchProps) {
  const { isDay } = useTheme();

  const trackColor = enabled
    ? isDay ? 'bg-[#4A2E1B]' : 'bg-[#F5F0E1]'
    : indeterminate
      ? isDay ? 'bg-[#4A2E1B]/50' : 'bg-[#F5F0E1]/50'
      : isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20';

  const thumbColor = enabled || indeterminate
    ? isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
    : isDay ? 'bg-[#4A2E1B]/40' : 'bg-[#F5F0E1]/40';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={indeterminate ? 'mixed' : enabled}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${trackColor} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full transition-transform duration-200 mt-0.5 ${thumbColor} ${
          enabled || indeterminate ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function NotificationPreferencesPanel() {
  const { isDay } = useTheme();
  const {
    loading,
    saving,
    error,
    isEnabled,
    updatePreference,
    isCategoryFullyEnabled,
    isCategoryPartiallyEnabled,
    toggleCategory,
  } = useNotificationPreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2
          className={`w-5 h-5 animate-spin ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
          strokeWidth={2}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {NOTIFICATION_CATEGORIES.map(category => {
        const Icon = CATEGORY_ICONS[category.icon];
        const fullyEnabled = isCategoryFullyEnabled(category.id);
        const partial = isCategoryPartiallyEnabled(category.id);

        return (
          <div
            key={category.id}
            className={`rounded-lg overflow-hidden ${
              isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <Icon
                    className={`w-5 h-5 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
                    strokeWidth={2}
                  />
                )}
                <div>
                  <p className={`text-sm font-semibold ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
                    {category.label}
                  </p>
                  <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
                    {category.description}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                enabled={fullyEnabled}
                indeterminate={partial}
                onChange={() => toggleCategory(category.id)}
                disabled={saving}
              />
            </div>

            <div className={`border-t ${isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'}`}>
              {category.types.map(notifType => (
                <div
                  key={notifType.type}
                  className={`flex items-center justify-between px-4 py-2.5 pl-12 ${
                    isDay ? 'hover:bg-[#4A2E1B]/5' : 'hover:bg-[#F5F0E1]/5'
                  }`}
                >
                  <div className="pr-3">
                    <p className={`text-sm ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
                      {notifType.label}
                    </p>
                    <p className={`text-xs ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
                      {notifType.description}
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={isEnabled(notifType.type as NotificationType)}
                    onChange={() =>
                      updatePreference(
                        notifType.type as NotificationType,
                        !isEnabled(notifType.type as NotificationType)
                      )
                    }
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
