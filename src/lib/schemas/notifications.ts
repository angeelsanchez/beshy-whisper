import { z } from 'zod';

export const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

export const webhookLikePayloadSchema = z.object({
  record: z.object({
    type: z.string(),
    user_id: z.string().uuid(),
    title: z.string().min(1),
    body: z.string().min(1),
    data: z.record(z.unknown()).optional(),
  }),
});
