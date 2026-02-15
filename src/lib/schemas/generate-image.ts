import { z } from 'zod';

const objectiveSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

export const generateImageSchema = z.object({
  mensaje: z.string().min(1).max(5000),
  objetivos: z.array(objectiveSchema).optional().default([]),
  display_name: z.string().min(1),
  display_id: z.string().min(1),
  fecha: z.string().optional().default(''),
  mode: z.enum(['normal', 'bubble', 'sticker', 'manifestation']),
  isDay: z.boolean(),
  profile_photo_url: z.string().nullable().optional(),
  daysManifesting: z.number().int().min(0).optional(),
  reaffirmationCount: z.number().int().min(0).optional(),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;
