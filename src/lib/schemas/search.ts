import { z } from 'zod';

export const userSearchSchema = z.object({
  q: z.string().min(1).max(50).transform(v => v.trim()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
