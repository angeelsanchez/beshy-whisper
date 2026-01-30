import { z } from 'zod';

export const deletePostSchema = z.object({
  entryId: z.string().uuid(),
});

export const updatePostSchema = z.object({
  entryId: z.string().uuid(),
  mensaje: z.string().optional(),
  is_private: z.boolean().optional(),
}).refine(
  (data) => data.mensaje !== undefined || data.is_private !== undefined,
  { message: 'Se requiere mensaje o cambio de privacidad' }
);
