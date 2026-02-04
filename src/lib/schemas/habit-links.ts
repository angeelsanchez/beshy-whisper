import { z } from 'zod';

export const requestHabitLinkSchema = z.object({
  responderId: z.string().uuid(),
  requesterHabitId: z.string().uuid(),
  message: z.string().trim().max(200).optional(),
});

export const respondHabitLinkSchema = z.object({
  linkId: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
  responderHabitId: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.action === 'accept') {
      return data.responderHabitId !== undefined;
    }
    return true;
  },
  { message: 'responderHabitId is required when accepting', path: ['responderHabitId'] }
);
