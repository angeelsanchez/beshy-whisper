import { z } from 'zod';

const pdfObjectiveSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(200),
  done: z.boolean(),
});

const pdfEntrySchema = z.object({
  id: z.string(),
  mensaje: z.string().min(1),
  fecha: z.string().min(1),
  franja: z.enum(['DIA', 'NOCHE']),
  objectives: z.array(pdfObjectiveSchema).optional(),
  is_private: z.boolean().optional().default(false),
  mood: z.string().nullable().optional(),
});

export const generatePdfSchema = z.object({
  entries: z.array(pdfEntrySchema).min(1).max(1000),
  userName: z.string().min(1).max(100),
  userId: z.string().min(1).max(50),
  isDay: z.boolean(),
  bsyId: z.string().min(1).max(50),
  profilePhotoUrl: z.string().url().nullable().optional(),
});

export type GeneratePdfInput = z.infer<typeof generatePdfSchema>;
export type PdfEntry = z.infer<typeof pdfEntrySchema>;
