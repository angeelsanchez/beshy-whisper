import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const trackingTypeSchema = z.enum(['binary', 'quantity', 'timer']);

const categorySchema = z.enum([
  'health', 'mind', 'productivity', 'wellness', 'social', 'creativity',
]);

const frequencyModeSchema = z.enum(['specific_days', 'weekly_count']);

const targetDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((arr) => new Set(arr).size === arr.length, {
    message: 'Duplicate days are not allowed',
  });

export const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  frequencyMode: frequencyModeSchema.default('specific_days'),
  targetDays: targetDaysSchema.default([0, 1, 2, 3, 4, 5, 6]),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  color: z.string().regex(hexColorRegex).default('#4A2E1B'),
  trackingType: trackingTypeSchema.default('binary'),
  targetValue: z.number().positive().max(999999).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  icon: z.string().trim().min(1).max(10).optional(),
  category: categorySchema.optional(),
  reminderTime: z.string().regex(timeRegex, 'Time must be HH:MM').optional(),
}).refine(
  (data) => {
    if (data.trackingType === 'quantity' || data.trackingType === 'timer') {
      return data.targetValue !== undefined && data.unit !== undefined;
    }
    return true;
  },
  { message: 'Quantity and timer habits require targetValue and unit', path: ['targetValue'] }
).refine(
  (data) => {
    if (data.frequencyMode === 'weekly_count') {
      return data.weeklyTarget !== undefined;
    }
    return true;
  },
  { message: 'Weekly count mode requires weeklyTarget', path: ['weeklyTarget'] }
);

export const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  frequencyMode: frequencyModeSchema.optional(),
  targetDays: targetDaysSchema.optional(),
  weeklyTarget: z.number().int().min(1).max(7).nullable().optional(),
  color: z.string().regex(hexColorRegex).optional(),
  trackingType: trackingTypeSchema.optional(),
  targetValue: z.number().positive().max(999999).nullable().optional(),
  unit: z.string().trim().min(1).max(20).nullable().optional(),
  icon: z.string().trim().min(1).max(10).nullable().optional(),
  category: categorySchema.nullable().optional(),
  reminderTime: z.string().regex(timeRegex, 'Time must be HH:MM').nullable().optional(),
  isActive: z.boolean().optional(),
  isShareable: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const toggleHabitLogSchema = z.object({
  habitId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  value: z.number().min(-999999).max(999999).optional(),
});

export const habitStatsQuerySchema = z.object({
  habitId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
});

export function derivedFromTargetDays(targetDays: number[]): {
  frequency: 'daily' | 'weekly';
  targetDaysPerWeek: number;
} {
  return {
    frequency: targetDays.length === 1 ? 'weekly' : 'daily',
    targetDaysPerWeek: targetDays.length,
  };
}
