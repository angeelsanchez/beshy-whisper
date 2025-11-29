import { z } from 'zod';

const statusSchema = z.enum(['active', 'fulfilled', 'archived']);

export const createManifestationSchema = z.object({
  content: z.string().trim().min(1).max(200),
});

export const updateManifestationSchema = z.object({
  content: z.string().trim().min(1).max(200).optional(),
  status: statusSchema.optional(),
});

export const reaffirmManifestationsSchema = z.object({
  manifestationIds: z.array(z.string().uuid()).min(1).max(10),
  entryId: z.string().uuid().optional(),
});

export const fulfillManifestationSchema = z.object({
  manifestationId: z.string().uuid(),
});

export type ManifestationStatus = z.infer<typeof statusSchema>;
export type CreateManifestationInput = z.infer<typeof createManifestationSchema>;
export type UpdateManifestationInput = z.infer<typeof updateManifestationSchema>;
export type ReaffirmManifestationsInput = z.infer<typeof reaffirmManifestationsSchema>;
export type FulfillManifestationInput = z.infer<typeof fulfillManifestationSchema>;
