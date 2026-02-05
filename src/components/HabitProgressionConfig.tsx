'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Plus, Trash2, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useHabitLevels, type LevelInput } from '@/hooks/useHabitLevels';
import type { Habit } from '@/hooks/useHabits';

const MIN_LEVELS = 2;
const MAX_LEVELS = 10;

interface HabitProgressionConfigProps {
  readonly habit: Habit;
  readonly isDay: boolean;
  readonly onSaved?: () => void;
}

interface LevelFormData {
  levelNumber: number;
  label: string;
  weeklyTarget: string;
  targetValue: string;
}

function createEmptyLevel(levelNumber: number): LevelFormData {
  return {
    levelNumber,
    label: '',
    weeklyTarget: '',
    targetValue: '',
  };
}

export default function HabitProgressionConfig({
  habit,
  isDay,
  onSaved,
}: HabitProgressionConfigProps): React.ReactElement {
  const { levels, loading, saveLevels } = useHabitLevels(habit.id);
  const [expanded, setExpanded] = useState(false);
  const [formLevels, setFormLevels] = useState<LevelFormData[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasProgression = habit.has_progression;
  const isQuantity = habit.tracking_type === 'quantity' || habit.tracking_type === 'timer';
  const isWeeklyMode = habit.frequency_mode === 'weekly_count';

  useEffect(() => {
    if (levels.length > 0) {
      setFormLevels(
        levels.map(l => ({
          levelNumber: l.level_number,
          label: l.label ?? '',
          weeklyTarget: l.weekly_target?.toString() ?? '',
          targetValue: l.target_value?.toString() ?? '',
        }))
      );
    } else if (!hasProgression) {
      setFormLevels([
        createEmptyLevel(1),
        createEmptyLevel(2),
      ]);
    }
  }, [levels, hasProgression]);

  const updateLevel = useCallback((index: number, field: keyof LevelFormData, value: string) => {
    setFormLevels(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSuccess(false);
  }, []);

  const addLevel = useCallback(() => {
    if (formLevels.length >= MAX_LEVELS) return;
    setFormLevels(prev => [...prev, createEmptyLevel(prev.length + 1)]);
    setSuccess(false);
  }, [formLevels.length]);

  const removeLevel = useCallback((index: number) => {
    if (formLevels.length <= MIN_LEVELS) return;
    setFormLevels(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((l, i) => ({ ...l, levelNumber: i + 1 }));
    });
    setSuccess(false);
  }, [formLevels.length]);

  const handleSave = async (): Promise<void> => {
    setError('');
    setSuccess(false);

    if (formLevels.length < MIN_LEVELS) {
      setError(`Debes definir al menos ${MIN_LEVELS} niveles`);
      return;
    }

    const levelsToSave: LevelInput[] = formLevels.map((l, idx) => {
      const level: LevelInput = {
        levelNumber: idx + 1,
        label: l.label.trim() || undefined,
      };

      if (isWeeklyMode && l.weeklyTarget) {
        const wt = parseInt(l.weeklyTarget, 10);
        if (!isNaN(wt) && wt >= 1 && wt <= 7) {
          level.weeklyTarget = wt;
        }
      }

      if (isQuantity && l.targetValue) {
        const tv = parseFloat(l.targetValue);
        if (!isNaN(tv) && tv > 0) {
          level.targetValue = tv;
        }
      }

      return level;
    });

    setSaving(true);
    const result = await saveLevels(levelsToSave);
    setSaving(false);

    if (result) {
      setSuccess(true);
      onSaved?.();
    } else {
      setError('No se pudo guardar la configuración');
    }
  };

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const muted = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const cardBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const inputBg = isDay ? 'bg-white border-[#4A2E1B]/20' : 'bg-[#3A2723] border-[#F5F0E1]/20';
  const levelBg = isDay ? 'bg-[#4A2E1B]/8' : 'bg-[#F5F0E1]/8';

  if (loading) {
    return (
      <div className={`p-4 rounded-xl ${cardBg} ${text}`}>
        <div className="flex items-center gap-2 text-xs opacity-50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Cargando configuración...
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl ${cardBg} ${text} space-y-3`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" strokeWidth={2} />
          Progresión por niveles
          {hasProgression && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              isDay ? 'bg-green-600/10 text-green-700' : 'bg-green-400/10 text-green-400'
            }`}>
              Activo
            </span>
          )}
        </h3>
        {expanded
          ? <ChevronUp className="w-4 h-4" strokeWidth={2} />
          : <ChevronDown className="w-4 h-4" strokeWidth={2} />
        }
      </button>

      {!expanded && !hasProgression && (
        <p className={`text-xs ${muted}`}>
          Define niveles para ir de menos a más (ej: 3 días/semana, luego 4, luego 5).
        </p>
      )}

      {expanded && (
        <div className="space-y-3 pt-1">
          <p className={`text-xs ${muted}`}>
            Cada nivel puede tener un objetivo diferente. Cuando cumplas consistentemente, podrás avanzar al siguiente.
          </p>

          <div className="space-y-2">
            {formLevels.map((level, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${levelBg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">Nivel {level.levelNumber}</span>
                  {formLevels.length > MIN_LEVELS && (
                    <button
                      onClick={() => removeLevel(idx)}
                      className="p-1 rounded opacity-40 hover:opacity-70 transition-opacity"
                      title="Eliminar nivel"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={level.label}
                    onChange={(e) => updateLevel(idx, 'label', e.target.value)}
                    placeholder="Etiqueta (ej: Principiante, Intermedio...)"
                    maxLength={100}
                    className={`w-full text-xs p-2 rounded-lg border ${inputBg} ${text}`}
                  />

                  <div className="flex gap-2">
                    {isWeeklyMode && (
                      <div className="flex-1">
                        <label className="text-[10px] opacity-60 mb-0.5 block">Días/semana</label>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={level.weeklyTarget}
                          onChange={(e) => updateLevel(idx, 'weeklyTarget', e.target.value)}
                          placeholder="Ej: 3"
                          className={`w-full text-xs p-2 rounded-lg border ${inputBg} ${text}`}
                        />
                      </div>
                    )}

                    {isQuantity && (
                      <div className="flex-1">
                        <label className="text-[10px] opacity-60 mb-0.5 block">
                          Objetivo ({habit.unit ?? 'cantidad'})
                        </label>
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={level.targetValue}
                          onChange={(e) => updateLevel(idx, 'targetValue', e.target.value)}
                          placeholder="Ej: 30"
                          className={`w-full text-xs p-2 rounded-lg border ${inputBg} ${text}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {formLevels.length < MAX_LEVELS && (
            <button
              onClick={addLevel}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isDay
                  ? 'bg-[#4A2E1B]/10 hover:bg-[#4A2E1B]/15'
                  : 'bg-[#F5F0E1]/10 hover:bg-[#F5F0E1]/15'
              }`}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Añadir nivel
            </button>
          )}

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {success && (
            <p className={`text-xs flex items-center gap-1 ${
              isDay ? 'text-green-700' : 'text-green-400'
            }`}>
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              Guardado correctamente
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || formLevels.length < MIN_LEVELS}
            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isDay
                ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                : 'bg-[#F5F0E1] text-[#2D1E1A]'
            } disabled:opacity-40`}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Guardando...
              </>
            ) : hasProgression ? (
              'Actualizar niveles'
            ) : (
              'Activar progresión'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
