'use client';

import { PASSWORD_RULES, getPasswordStrength, type PasswordStrength } from '@/lib/schemas/password';

interface PasswordStrengthIndicatorProps {
  readonly password: string;
}

const STRENGTH_CONFIG: Record<Exclude<PasswordStrength, 'empty'>, { label: string; color: string; width: string }> = {
  weak: { label: 'Débil', color: 'bg-red-500', width: 'w-1/3' },
  medium: { label: 'Media', color: 'bg-amber-500', width: 'w-2/3' },
  strong: { label: 'Fuerte', color: 'bg-green-500', width: 'w-full' },
};

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);

  if (strength === 'empty') return null;

  const config = STRENGTH_CONFIG[strength];

  return (
    <div aria-live="polite" className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${config.color} ${config.width}`}
            role="progressbar"
            aria-valuenow={strength === 'weak' ? 33 : strength === 'medium' ? 66 : 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Fortaleza de contraseña: ${config.label}`}
          />
        </div>
        <span className="text-xs font-medium min-w-[3rem]">{config.label}</span>
      </div>

      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const passes = rule.regex.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-xs">
              <span className={passes ? 'text-green-600' : 'text-red-500'} aria-hidden="true">
                {passes ? '\u2713' : '\u2717'}
              </span>
              <span className={passes ? 'opacity-70' : 'opacity-100'}>
                {rule.label}
              </span>
              <span className="sr-only">{passes ? '(cumplido)' : '(pendiente)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
