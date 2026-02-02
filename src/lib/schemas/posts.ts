import { z } from 'zod';

export const deletePostSchema = z.object({
  entryId: z.string().uuid(),
});

const moodEnum = z.enum([
  'feliz', 'tranquilo', 'agradecido', 'energetico',
  'triste', 'ansioso', 'cansado', 'frustrado',
]);

export const createPostSchema = z.object({
  mensaje: z.string().min(1).max(300).transform(v => v.trim()),
  franja: z.enum(['DIA', 'NOCHE']),
  is_private: z.boolean().default(false),
  objectives: z.array(z.string().min(1).max(200).transform(v => v.trim())).max(15).default([]),
  mood: moodEnum.nullable().optional(),
});

export const updatePostSchema = z.object({
  entryId: z.string().uuid(),
  mensaje: z.string().optional(),
  is_private: z.boolean().optional(),
}).refine(
  (data) => data.mensaje !== undefined || data.is_private !== undefined,
  { message: 'Se requiere mensaje o cambio de privacidad' }
);
