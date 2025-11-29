'use client';

import { Hand, Sparkles, Sprout, type LucideIcon } from 'lucide-react';

interface InitiativeEmptyStateProps {
  readonly type: 'joined' | 'discover' | 'all';
  readonly isDay: boolean;
}

interface EmptyStateConfig {
  readonly Icon: LucideIcon;
  readonly title: string;
  readonly subtitle: string;
}

const CONFIG: Record<string, EmptyStateConfig> = {
  joined: {
    Icon: Hand,
    title: 'Aún no te has unido a ninguna iniciativa',
    subtitle: 'Explora las iniciativas disponibles y únete a una comunidad',
  },
  discover: {
    Icon: Sparkles,
    title: 'No hay más iniciativas disponibles',
    subtitle: 'Ya estás en todas las iniciativas activas',
  },
  all: {
    Icon: Sprout,
    title: 'No hay iniciativas comunitarias',
    subtitle: 'Las iniciativas aparecerán aquí cuando estén disponibles',
  },
};

export default function InitiativeEmptyState({
  type,
  isDay,
}: InitiativeEmptyStateProps): React.ReactElement {
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const { Icon, title, subtitle } = CONFIG[type];

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Icon className="w-10 h-10 mb-3 opacity-60" strokeWidth={1.5} aria-hidden="true" />
      <p className={`text-sm font-medium ${textColor}`}>{title}</p>
      <p className={`text-xs mt-1 ${subtextColor}`}>{subtitle}</p>
    </div>
  );
}
