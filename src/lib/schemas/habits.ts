import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

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
  targetDays: targetDaysSchema.default([0, 1, 2, 3, 4, 5, 6]),
  color: z.string().regex(hexColorRegex).default('#4A2E1B'),
});

export const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  targetDays: targetDaysSchema.optional(),
  color: z.string().regex(hexColorRegex).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const toggleHabitLogSchema = z.object({
  habitId: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
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
