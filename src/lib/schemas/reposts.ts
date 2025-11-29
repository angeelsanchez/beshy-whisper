import { z } from 'zod';

export const toggleRepostSchema = z.object({
  entryId: z.string().uuid(),
});

export const repostStatusSchema = z.object({
  entryId: z.string().uuid(),
});
