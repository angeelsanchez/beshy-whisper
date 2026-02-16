import { z } from 'zod';

export const deletePostSchema = z.object({
  entryId: z.string().uuid(),
});

const moodEnum = z.enum([
  'feliz', 'tranquilo', 'agradecido', 'energetico',
  'triste', 'ansioso', 'cansado', 'frustrado',
]);

const habitSnapshotSchema = z.object({
  habitId: z.string().uuid(),
  habitName: z.string().min(1).max(100),
  habitIcon: z.string().max(10).nullable().optional(),
  habitColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#4A2E1B'),
  trackingType: z.enum(['binary', 'quantity', 'timer']).default('binary'),
  targetValue: z.number().positive().max(999999).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  completedValue: z.number().max(999999).nullable().optional(),
  isCompleted: z.boolean().default(true),
});

export const createPostSchema = z.object({
  mensaje: z.string().min(1).max(300).transform(v => v.trim()),
  franja: z.enum(['DIA', 'NOCHE', 'SEMANA']),
  is_private: z.boolean().default(false),
  objectives: z.array(z.string().min(1).max(200).transform(v => v.trim())).max(15).default([]),
  mood: moodEnum.nullable().optional(),
  habitSnapshots: z.array(habitSnapshotSchema).max(20).default([]),
}).refine(
  (data) => {
    if (data.franja === 'SEMANA') {
      return data.objectives.length <= 3;
    }
    return data.objectives.length <= 15;
  },
  { message: 'Weekly whispers can have max 3 objectives, daily whispers max 15' }
);

export const updatePostSchema = z.object({
  entryId: z.string().uuid(),
  mensaje: z.string().optional(),
  is_private: z.boolean().optional(),
}).refine(
  (data) => data.mensaje !== undefined || data.is_private !== undefined,
  { message: 'Se requiere mensaje o cambio de privacidad' }
);
