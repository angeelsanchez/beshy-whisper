'use client';

interface InitiativeEmptyStateProps {
  readonly type: 'joined' | 'discover' | 'all';
  readonly isDay: boolean;
}

export default function InitiativeEmptyState({
  type,
  isDay,
}: InitiativeEmptyStateProps): React.ReactElement {
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';

  const config = {
    joined: {
      icon: '\uD83D\uDC4B',
      title: 'Aún no te has unido a ninguna iniciativa',
      subtitle: 'Explora las iniciativas disponibles y únete a una comunidad',
    },
    discover: {
      icon: '\uD83C\uDF1F',
      title: 'No hay más iniciativas disponibles',
      subtitle: 'Ya estás en todas las iniciativas activas',
    },
    all: {
      icon: '\uD83C\uDF31',
      title: 'No hay iniciativas comunitarias',
      subtitle: 'Las iniciativas aparecerán aquí cuando estén disponibles',
    },
  };

  const { icon, title, subtitle } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <span className="text-4xl mb-3" aria-hidden="true">{icon}</span>
      <p className={`text-sm font-medium ${textColor}`}>{title}</p>
      <p className={`text-xs mt-1 ${subtextColor}`}>{subtitle}</p>
    </div>
  );
}
