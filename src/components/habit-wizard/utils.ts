import { ALL_DAYS, WEEKDAYS, WEEKEND_DAYS, DAY_LABELS } from './constants';
import type { FormState, InitialHabitData } from './types';

export function getInitialForm(initialData?: InitialHabitData): FormState {
  if (!initialData) {
    return {
      name: '',
      description: '',
      trackingType: 'binary',
      targetValueStr: '',
      unit: '',
      frequencyMode: 'specific_days',
      targetDays: [...ALL_DAYS],
      weeklyTargetStr: '3',
      color: '#4A2E1B',
      icon: '',
      category: null,
      reminderEnabled: false,
      reminderTime: '09:00',
      hasProgression: false,
    };
  }

  return {
    name: initialData.name,
    description: initialData.description ?? '',
    trackingType: initialData.tracking_type,
    targetValueStr: initialData.target_value?.toString() ?? '',
    unit: initialData.unit ?? '',
    frequencyMode: initialData.frequency_mode ?? 'specific_days',
    targetDays: Array.isArray(initialData.target_days) && initialData.target_days.length > 0
      ? [...initialData.target_days].sort((a, b) => a - b)
      : [...ALL_DAYS],
    weeklyTargetStr: initialData.weekly_target?.toString() ?? '3',
    color: initialData.color,
    icon: initialData.icon ?? '',
    category: initialData.category,
    reminderEnabled: initialData.reminder_time !== null,
    reminderTime: initialData.reminder_time ?? '09:00',
    hasProgression: initialData.has_progression ?? false,
  };
}

export function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

export function formatDaysLabel(days: readonly number[]): string {
  if (arraysEqual(days, [...ALL_DAYS])) return 'Todos los días';
  if (arraysEqual(days, [...WEEKDAYS])) return 'Lunes a Viernes';
  if (arraysEqual(days, [...WEEKEND_DAYS])) return 'Fines de semana';
  return days.map(d => DAY_LABELS[d]).join(', ');
}
