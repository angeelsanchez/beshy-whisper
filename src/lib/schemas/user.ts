import { z } from 'zod';

export const updateNameSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(50, 'Name cannot exceed 50 characters').transform(v => v.trim()),
});
