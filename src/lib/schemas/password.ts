import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  { label: '8+ caracteres', regex: /.{8,}/ },
  { label: 'Una letra mayúscula', regex: /[A-Z]/ },
  { label: 'Una letra minúscula', regex: /[a-z]/ },
  { label: 'Un número', regex: /[0-9]/ },
  { label: 'Un carácter especial', regex: /[^A-Za-z0-9]/ },
] as const;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'La contraseña debe tener al menos 8 caracteres')
  .max(PASSWORD_MAX_LENGTH, 'La contraseña no puede exceder 128 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un carácter especial');

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 'empty';

  let score = 0;
  for (const rule of PASSWORD_RULES) {
    if (rule.regex.test(password)) score++;
  }

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

export const passwordConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
