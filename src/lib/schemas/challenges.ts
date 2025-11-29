import { z } from 'zod';

function isValidDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido (YYYY-MM-DD)')
  .refine(isValidDate, 'Fecha invalida');

export const createChallengeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  theme: z.string().trim().max(50).nullable().optional(),
  start_date: dateSchema,
  end_date: dateSchema,
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio', path: ['end_date'] }
);

export const participateSchema = z.object({
  challengeId: z.string().uuid(),
  entryId: z.string().uuid(),
});
