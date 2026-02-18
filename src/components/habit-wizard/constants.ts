import { CATEGORIES, type HabitCategory } from '@/lib/habit-templates';

export const PRESET_COLORS = [
  '#4A2E1B', '#8B5E3C', '#A0522D', '#CD853F',
  '#2E7D32', '#1565C0', '#6A1B9A', '#C62828',
  '#EF6C00', '#00838F', '#4E342E', '#37474F',
] as const;

export const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;
export const WEEKEND_DAYS = [0, 6] as const;
export const COMMON_UNITS = ['vasos', 'p\u00e1ginas', 'min', 'km', 'pasos', 'reps'] as const;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as HabitCategory[];
export const DAY_PRESETS = [
  { label: 'Todos', days: [...ALL_DAYS] },
  { label: 'L-V', days: [...WEEKDAYS] },
  { label: 'Fines', days: [...WEEKEND_DAYS] },
] as const;

export const WEEKLY_TARGET_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;
export const TIMER_PRESETS = [15, 20, 30, 45, 60] as const;
