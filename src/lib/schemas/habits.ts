import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  targetDaysPerWeek: z.coerce.number().int().min(1).max(7).default(7),
  color: z.string().regex(hexColorRegex).default('#4A2E1B'),
});

export const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  frequency: z.enum(['daily', 'weekly']).optional(),
  targetDaysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
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
