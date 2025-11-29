import { z } from 'zod';

export const toggleFollowSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const followStatusSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const followListSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['followers', 'following']),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
