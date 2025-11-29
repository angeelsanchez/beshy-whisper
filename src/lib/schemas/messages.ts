import { z } from 'zod';

const DM_MAX_LENGTH = 500;

export const sendDmSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'El mensaje no puede estar vacio')
    .max(DM_MAX_LENGTH, `Maximo ${DM_MAX_LENGTH} caracteres`),
});

export const startConversationSchema = z.object({
  targetUserId: z.string().uuid('ID de usuario invalido'),
});

export const messagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid('ID de conversacion invalido'),
});

export type SendDmInput = z.infer<typeof sendDmSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type MessagesQueryInput = z.infer<typeof messagesQuerySchema>;
