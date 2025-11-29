'use client';

import type { InitiativeParticipant } from '@/types/initiative';

interface InitiativeParticipantListProps {
  readonly participants: ReadonlyArray<InitiativeParticipant>;
  readonly maxVisible?: number;
  readonly isDay: boolean;
}

function AvatarBubble({
  participant,
  isDay,
}: {
  readonly participant: InitiativeParticipant;
  readonly isDay: boolean;
}): React.ReactElement {
  const checked = participant.checked_in_today;
  const borderColor = checked ? 'border-green-500' : (isDay ? 'border-[#4A2E1B]/20' : 'border-[#F5F0E1]/20');
  const grayscale = checked ? '' : 'grayscale opacity-50';
  const initial = (participant.alias ?? participant.name ?? '?')[0]?.toUpperCase() ?? '?';
  const bgFallback = isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]';
  const checkColor = isDay ? 'text-green-600' : 'text-green-400';
  const uncheckColor = isDay ? 'text-[#4A2E1B]/20' : 'text-[#F5F0E1]/20';

  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0" aria-label={`${participant.alias ?? participant.name ?? 'Usuario'}: ${checked ? 'completado' : 'pendiente'}`}>
      <div className={`w-9 h-9 rounded-full border-2 ${borderColor} overflow-hidden ${grayscale}`}>
        {participant.profile_photo_url ? (
          <img
            src={participant.profile_photo_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${bgFallback}`}>
            {initial}
          </div>
        )}
      </div>
      {checked ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16" className={checkColor}>
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      ) : (
        <div className={`w-2.5 h-2.5 rounded-full border ${uncheckColor}`} />
      )}
    </div>
  );
}

export default function InitiativeParticipantList({
  participants,
  maxVisible = 8,
  isDay,
}: InitiativeParticipantListProps): React.ReactElement {
  const visible = participants.slice(0, maxVisible);
  const overflow = participants.length - maxVisible;
  const textColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';

  if (participants.length === 0) {
    return (
      <p className={`text-xs ${textColor}`}>
        Aún no hay participantes
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2 overflow-x-auto pb-1 scrollbar-hide" role="list" aria-label="Participantes">
      {visible.map(p => (
        <AvatarBubble key={p.user_id} participant={p} isDay={isDay} />
      ))}
      {overflow > 0 && (
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
            isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]/60' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]/60'
          }`}>
            +{overflow}
          </div>
        </div>
      )}
    </div>
  );
}
