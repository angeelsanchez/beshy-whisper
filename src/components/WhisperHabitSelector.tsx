'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, ChevronDown, ChevronUp, Check } from 'lucide-react';
import AppIcon from '@/components/AppIcon';

interface ShareableHabit {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  tracking_type: 'binary' | 'quantity' | 'timer';
  target_value: number | null;
  unit: string | null;
  is_completed: boolean;
  completed_value: number | null;
}

export interface HabitSnapshotPayload {
  habitId: string;
  habitName: string;
  habitIcon: string | null;
  habitColor: string;
  trackingType: 'binary' | 'quantity' | 'timer';
  targetValue: number | null;
  unit: string | null;
  completedValue: number | null;
  isCompleted: boolean;
}

interface WhisperHabitSelectorProps {
  readonly isDay: boolean;
  readonly userId: string;
  readonly onSelectionChange: (snapshots: HabitSnapshotPayload[]) => void;
}

export default function WhisperHabitSelector({
  isDay,
  userId,
  onSelectionChange,
}: WhisperHabitSelectorProps): React.ReactElement | null {
  const [habits, setHabits] = useState<ShareableHabit[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchShareableHabits = async () => {
      try {
        const [habitsRes, statsRes] = await Promise.all([
          fetch('/api/habits'),
          fetch('/api/habits/stats'),
        ]);

        if (!habitsRes.ok || !statsRes.ok) {
          setLoading(false);
          return;
        }

        const habitsData = await habitsRes.json();
        const statsData = await statsRes.json();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const statsMap = new Map<string, { completionsByDate: Record<string, boolean | number> }>();
        for (const stat of statsData.stats ?? []) {
          statsMap.set(stat.habitId, stat);
        }

        const shareableList: ShareableHabit[] = [];

        for (const h of habitsData.habits ?? []) {
          if (!h.is_shareable) continue;

          const stat = statsMap.get(h.id);
          const todayCompletion = stat?.completionsByDate?.[todayStr];
          const isCompleted = todayCompletion !== undefined && todayCompletion !== false;
          const completedValue = typeof todayCompletion === 'number' ? todayCompletion : null;

          shareableList.push({
            id: h.id,
            name: h.name,
            icon: h.icon,
            color: h.color,
            tracking_type: h.tracking_type,
            target_value: h.target_value,
            unit: h.unit,
            is_completed: isCompleted,
            completed_value: completedValue,
          });
        }

        setHabits(shareableList);

        const completedIds = new Set(
          shareableList.filter(h => h.is_completed).map(h => h.id)
        );
        setSelectedIds(completedIds);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchShareableHabits();
  }, [userId]);

  const buildPayload = useCallback((ids: Set<string>): HabitSnapshotPayload[] => {
    return habits
      .filter(h => ids.has(h.id))
      .map(h => ({
        habitId: h.id,
        habitName: h.name,
        habitIcon: h.icon,
        habitColor: h.color,
        trackingType: h.tracking_type,
        targetValue: h.target_value,
        unit: h.unit,
        completedValue: h.completed_value,
        isCompleted: h.is_completed,
      }));
  }, [habits]);

  useEffect(() => {
    onSelectionChange(buildPayload(selectedIds));
  }, [selectedIds, buildPayload, onSelectionChange]);

  const toggleHabit = (habitId: string): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  if (loading || habits.length === 0) return null;

  const selectedCount = selectedIds.size;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isDay
            ? 'bg-[#4A2E1B]/8 text-[#4A2E1B] hover:bg-[#4A2E1B]/12'
            : 'bg-[#F5F0E1]/8 text-[#F5F0E1] hover:bg-[#F5F0E1]/12'
        }`}
      >
        <Target className="w-4 h-4" strokeWidth={2} />
        <span className="flex-1 text-left">
          Incluir mis hábitos
          {selectedCount > 0 && (
            <span className={`ml-1.5 text-xs ${isDay ? 'opacity-60' : 'opacity-60'}`}>
              ({selectedCount} seleccionados)
            </span>
          )}
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4" strokeWidth={2} />
          : <ChevronDown className="w-4 h-4" strokeWidth={2} />
        }
      </button>

      {expanded && (
        <div className={`mt-2 rounded-lg p-3 space-y-1 ${
          isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
        }`}>
          <p className={`text-[11px] mb-2 ${isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'}`}>
            Selecciona los hábitos que quieres compartir en tu whisper nocturno
          </p>
          {habits.map(habit => {
            const isSelected = selectedIds.has(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleHabit(habit.id)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs transition-all text-left ${
                  isSelected
                    ? isDay
                      ? 'bg-[#4A2E1B]/10'
                      : 'bg-[#F5F0E1]/10'
                    : 'opacity-60 hover:opacity-80'
                } ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
              >
                <span
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'border-transparent' : isDay ? 'border-[#4A2E1B]/30' : 'border-[#F5F0E1]/30'
                  }`}
                  style={isSelected ? { backgroundColor: habit.color } : undefined}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>

                {habit.icon && (
                  <AppIcon identifier={habit.icon} type="habit" className="w-4 h-4 flex-shrink-0" />
                )}

                <span className="flex-1 min-w-0 truncate">{habit.name}</span>

                {habit.is_completed ? (
                  <span className="text-green-500 text-[10px] font-medium flex-shrink-0">Hecho</span>
                ) : (
                  <span className={`text-[10px] flex-shrink-0 ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`}>
                    Pendiente
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
