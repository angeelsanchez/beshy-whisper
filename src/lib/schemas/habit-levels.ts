import { z } from 'zod';

const levelItemSchema = z.object({
  levelNumber: z.number().int().min(1).max(10),
  label: z.string().trim().max(100).optional(),
  targetDays: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .optional(),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  targetValue: z.number().positive().max(999999).optional(),
});

export const setLevelsSchema = z.object({
  levels: z
    .array(levelItemSchema)
    .min(2, 'At least 2 levels required for progression')
    .max(10)
    .refine(
      (levels) => {
        const numbers = levels.map((l) => l.levelNumber);
        return new Set(numbers).size === numbers.length;
      },
      { message: 'Duplicate level numbers are not allowed' }
    ),
});

export const advanceLevelSchema = z.object({
  confirm: z.literal(true),
});
