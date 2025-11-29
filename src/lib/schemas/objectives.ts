import { z } from 'zod';

export const patchObjectiveSchema = z.object({
  objectiveId: z.string().uuid(),
  done: z.boolean(),
});

export const deleteObjectiveSchema = z.object({
  objectiveId: z.string().uuid(),
});

export const batchObjectivesSchema = z.object({
  objectives: z.array(z.object({
    user_id: z.string().uuid(),
    entry_id: z.string().uuid(),
    text: z.string().min(1),
    done: z.boolean().optional().default(false),
  })).min(1),
});
