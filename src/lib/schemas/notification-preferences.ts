import { z } from 'zod';
import { NOTIFICATION_TYPES } from '@/types/notification-preferences';

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.record(
    z.enum(NOTIFICATION_TYPES),
    z.boolean()
  ),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
