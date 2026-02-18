import { z } from 'zod';

export const sendLikeSchema = z.object({
  entryId: z.string().uuid(),
  likerUserId: z.string().uuid(),
});

export const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
});

export const testPushSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(1000).optional(),
  icon: z.string().optional(),
  tag: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const cronReminderSchema = z.object({
  action: z.literal('process'),
  secret: z.string().min(1),
});

export const scheduleReminderSchema = z.object({
  action: z.literal('process'),
});
