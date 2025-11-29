import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const trackingTypeSchema = z.enum(['binary', 'quantity', 'timer']);

const categorySchema = z.enum([
  'health', 'mind', 'productivity', 'wellness', 'social', 'creativity',
]);

function isValidDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export const createInitiativeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  icon: z.string().trim().min(1).max(10).optional(),
  color: z.string().regex(hexColorRegex).default('#4A2E1B'),
  category: categorySchema.optional(),
  trackingType: trackingTypeSchema.default('binary'),
  targetValue: z.number().positive().max(999999).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  startDate: z
    .string()
    .regex(dateRegex, 'Date must be YYYY-MM-DD')
    .refine(isValidDate, { message: 'Invalid calendar date' }),
  endDate: z
    .string()
    .regex(dateRegex, 'Date must be YYYY-MM-DD')
    .refine(isValidDate, { message: 'Invalid calendar date' })
    .optional(),
  maxParticipants: z.number().int().positive().max(10000).optional(),
  reminderTime: z.string().regex(timeRegex, 'Time must be HH:MM').optional(),
}).refine(
  (data) => {
    if (data.trackingType === 'quantity' || data.trackingType === 'timer') {
      return data.targetValue !== undefined && data.unit !== undefined;
    }
    return true;
  },
  { message: 'Quantity and timer initiatives require targetValue and unit', path: ['targetValue'] }
).refine(
  (data) => {
    if (data.endDate) {
      return data.endDate > data.startDate;
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

export const updateInitiativeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  icon: z.string().trim().min(1).max(10).nullable().optional(),
  color: z.string().regex(hexColorRegex).optional(),
  category: categorySchema.nullable().optional(),
  isActive: z.boolean().optional(),
  maxParticipants: z.number().int().positive().max(10000).nullable().optional(),
  reminderTime: z.string().regex(timeRegex, 'Time must be HH:MM').nullable().optional(),
});

export const initiativeCheckinSchema = z.object({
  date: z
    .string()
    .regex(dateRegex, 'Date must be YYYY-MM-DD')
    .refine(isValidDate, { message: 'Invalid calendar date' })
    .optional(),
  value: z.number().min(-999999).max(999999).optional(),
});

export const initiativeListQuerySchema = z.object({
  joined: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const initiativeProgressQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});
