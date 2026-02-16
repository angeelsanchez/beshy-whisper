'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { logger } from '@/lib/logger';

export default function PrivacyPreferencesPanel(): React.ReactElement {
  const { isDay } = useTheme();
  const [defaultPostPrivacy, setDefaultPostPrivacy] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          setDefaultPostPrivacy(data.defaultPostPrivacy || 'public');
        }
      } catch (error) {
        logger.error('Error loading privacy preferences', { error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handlePrivacyChange = async (newValue: 'public' | 'private') => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPostPrivacy: newValue }),
      });

      if (response.ok) {
        setDefaultPostPrivacy(newValue);
      }
    } catch (error) {
      logger.error('Error updating privacy preferences', { error: String(error) });
    } finally {
      setSaving(false);
    }
  };

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const textMuted = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
  const bgOption = (isSelected: boolean) =>
    isSelected
      ? isDay
        ? 'bg-[#4A2E1B]/15 border-[#4A2E1B]'
        : 'bg-[#F5F0E1]/15 border-[#F5F0E1]'
      : isDay
        ? 'bg-[#4A2E1B]/5 border-[#4A2E1B]/20'
        : 'bg-[#F5F0E1]/5 border-[#F5F0E1]/20';

  if (loading) {
    return (
      <div className="space-y-4">
        <p className={textMuted}>Cargando preferencias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${text}`}>
          Privacidad de whispers
        </h3>
        <p className={`text-xs mb-3 ${textMuted}`}>
          Elige la privacidad por defecto para tus nuevos whispers
        </p>

        <div className="space-y-2">
          <button
            onClick={() => handlePrivacyChange('public')}
            disabled={saving}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${bgOption(
              defaultPostPrivacy === 'public'
            )} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="radio"
              checked={defaultPostPrivacy === 'public'}
              disabled
              className="w-4 h-4 cursor-pointer"
            />
            <div className="flex-1 text-left">
              <p className={`text-sm font-medium ${text}`}>Público</p>
              <p className={`text-xs ${textMuted}`}>
                Visible en el feed para otros usuarios
              </p>
            </div>
          </button>

          <button
            onClick={() => handlePrivacyChange('private')}
            disabled={saving}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${bgOption(
              defaultPostPrivacy === 'private'
            )} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="radio"
              checked={defaultPostPrivacy === 'private'}
              disabled
              className="w-4 h-4 cursor-pointer"
            />
            <div className="flex-1 text-left">
              <p className={`text-sm font-medium ${text}`}>Privado</p>
              <p className={`text-xs ${textMuted}`}>
                Solo visible para ti
              </p>
            </div>
          </button>
        </div>
      </div>

      {saving && (
        <p className={`text-xs ${textMuted}`}>Actualizando...</p>
      )}
    </div>
  );
}
