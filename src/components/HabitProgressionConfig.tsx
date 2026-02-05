'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Plus, X, Loader2, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useHabitLevels, type LevelInput } from '@/hooks/useHabitLevels';
import type { Habit } from '@/hooks/useHabits';

const MIN_LEVELS = 2;
const MAX_LEVELS = 10;

const LEVEL_SUGGESTIONS = [
  { label: 'Empezar suave', hint: 'Tan fácil que no puedas fallar' },
  { label: 'Coger ritmo', hint: 'Un pequeño paso más' },
  { label: 'Consolidar', hint: 'Ya es parte de ti' },
  { label: 'Dominar', hint: 'Nivel avanzado' },
  { label: 'Experto', hint: 'Máximo rendimiento' },
];

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
  const suggestion = LEVEL_SUGGESTIONS[levelNumber - 1] ?? LEVEL_SUGGESTIONS[4];
  return {
    levelNumber,
    label: suggestion.label,
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
          label: l.label ?? LEVEL_SUGGESTIONS[l.level_number - 1]?.label ?? '',
          weeklyTarget: l.weekly_target?.toString() ?? '',
          targetValue: l.target_value?.toString() ?? '',
        }))
      );
    } else if (!hasProgression) {
      setFormLevels([
        createEmptyLevel(1),
        createEmptyLevel(2),
        createEmptyLevel(3),
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
  const inputBg = isDay
    ? 'bg-white/80 border-[#4A2E1B]/10 focus:border-[#4A2E1B]/30 focus:ring-1 focus:ring-[#4A2E1B]/10'
    : 'bg-[#3A2723]/80 border-[#F5F0E1]/10 focus:border-[#F5F0E1]/30 focus:ring-1 focus:ring-[#F5F0E1]/10';

  if (loading) {
    return (
      <div className={`p-4 rounded-xl ${cardBg} ${text}`}>
        <div className="flex items-center gap-2 text-xs opacity-50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl ${cardBg} ${text} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
          }`}>
            <TrendingUp className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold flex items-center gap-2">
              Progresión
              {hasProgression && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isDay ? 'bg-green-600/15 text-green-700' : 'bg-green-400/15 text-green-400'
                }`}>
                  Activo
                </span>
              )}
            </h3>
            {!expanded && (
              <p className={`text-[11px] ${muted}`}>
                {hasProgression
                  ? `${levels.length} niveles configurados`
                  : 'Empieza pequeño, crece gradualmente'
                }
              </p>
            )}
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
        }`}>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            isDay ? 'bg-amber-500/10' : 'bg-amber-400/10'
          }`}>
            <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isDay ? 'text-amber-600' : 'text-amber-400'
            }`} strokeWidth={2} />
            <p className={`text-[11px] leading-relaxed ${
              isDay ? 'text-amber-800' : 'text-amber-300'
            }`}>
              El truco está en empezar ridículamente fácil. Un hábito debe establecerse antes de poder mejorarse.
            </p>
          </div>

          <div className="space-y-3">
            {formLevels.map((level, idx) => {
              const suggestion = LEVEL_SUGGESTIONS[idx];
              return (
                <div
                  key={idx}
                  className={`relative rounded-xl border ${
                    isDay ? 'border-[#4A2E1B]/10 bg-white/50' : 'border-[#F5F0E1]/10 bg-[#3A2723]/30'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3 pb-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDay
                          ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                          : 'bg-[#F5F0E1] text-[#2D1E1A]'
                      }`}
                    >
                      {level.levelNumber}
                    </div>
                    <input
                      type="text"
                      value={level.label}
                      onChange={(e) => updateLevel(idx, 'label', e.target.value)}
                      placeholder={suggestion?.label ?? `Nivel ${level.levelNumber}`}
                      maxLength={50}
                      className={`flex-1 text-sm font-medium bg-transparent border-0 p-0 focus:ring-0 placeholder:opacity-40 ${text}`}
                    />
                    {formLevels.length > MIN_LEVELS && (
                      <button
                        onClick={() => removeLevel(idx)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isDay
                            ? 'hover:bg-red-500/10 text-[#4A2E1B]/40 hover:text-red-600'
                            : 'hover:bg-red-400/10 text-[#F5F0E1]/40 hover:text-red-400'
                        }`}
                        title="Eliminar nivel"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {(isWeeklyMode || isQuantity) && (
                    <div className="flex gap-2 px-3 pb-3">
                      {isWeeklyMode && (
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={7}
                              value={level.weeklyTarget}
                              onChange={(e) => updateLevel(idx, 'weeklyTarget', e.target.value)}
                              placeholder={String(Math.min(idx + 1, 7))}
                              className={`w-12 text-center text-sm p-1.5 rounded-lg border transition-all ${inputBg} ${text}`}
                            />
                            <span className={`text-[11px] ${muted}`}>días/semana</span>
                          </div>
                        </div>
                      )}

                      {isQuantity && (
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              step="any"
                              value={level.targetValue}
                              onChange={(e) => updateLevel(idx, 'targetValue', e.target.value)}
                              placeholder={String((idx + 1) * 10)}
                              className={`w-16 text-center text-sm p-1.5 rounded-lg border transition-all ${inputBg} ${text}`}
                            />
                            <span className={`text-[11px] ${muted}`}>{habit.unit ?? 'uds'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {suggestion?.hint && idx < 3 && (
                    <div className={`px-3 pb-2 -mt-1`}>
                      <p className={`text-[10px] ${muted}`}>{suggestion.hint}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {formLevels.length < MAX_LEVELS && (
            <button
              onClick={addLevel}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border-2 border-dashed transition-all ${
                isDay
                  ? 'border-[#4A2E1B]/20 hover:border-[#4A2E1B]/40 hover:bg-[#4A2E1B]/5'
                  : 'border-[#F5F0E1]/20 hover:border-[#F5F0E1]/40 hover:bg-[#F5F0E1]/5'
              }`}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Añadir nivel
            </button>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          {success && (
            <div className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium ${
              isDay ? 'bg-green-600/10 text-green-700' : 'bg-green-400/10 text-green-400'
            }`}>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Guardado
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || formLevels.length < MIN_LEVELS}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isDay
                ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A2415] active:scale-[0.98]'
                : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1] active:scale-[0.98]'
            } disabled:opacity-40 disabled:active:scale-100`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : hasProgression ? (
              'Guardar cambios'
            ) : (
              <>
                <TrendingUp className="w-4 h-4" strokeWidth={2} />
                Activar progresión
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
