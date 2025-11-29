import { z } from 'zod';

export const toggleLikeSchema = z.object({
  entryId: z.string().uuid(),
});

export const likeStatusSchema = z.object({
  entryId: z.string().uuid(),
});
