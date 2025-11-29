'use client';

import type { InitiativeListItem } from '@/types/initiative';
import InitiativeEmptyState from './InitiativeEmptyState';

interface InitiativeDiscoverListProps {
  readonly initiatives: ReadonlyArray<InitiativeListItem>;
  readonly joining: string | null;
  readonly isDay: boolean;
  readonly onJoin: (initiativeId: string) => void;
}

function DiscoverCard({
  initiative,
  joining,
  isDay,
  onJoin,
}: {
  readonly initiative: InitiativeListItem;
  readonly joining: string | null;
  readonly isDay: boolean;
  readonly onJoin: (id: string) => void;
}): React.ReactElement {
  const bgColor = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const isJoining = joining === initiative.id;
  const isFull = initiative.max_participants !== null && initiative.participant_count >= initiative.max_participants;

  return (
    <div className={`p-3 rounded-xl ${bgColor}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
          {initiative.icon ?? '\uD83C\uDFAF'}
        </span>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${textColor}`}>{initiative.name}</p>
          <p className={`text-xs mt-0.5 line-clamp-2 ${subtextColor}`}>
            {initiative.description}
          </p>
          <div className={`flex items-center gap-3 mt-1.5 text-[10px] ${subtextColor}`}>
            <span>{initiative.participant_count} {initiative.participant_count === 1 ? 'persona' : 'personas'}</span>
            {initiative.tracking_type !== 'binary' && initiative.target_value !== null && initiative.unit && (
              <span>{initiative.target_value} {initiative.unit}/día</span>
            )}
            {initiative.community_streak > 0 && (
              <span>{'\uD83D\uDD25'} {initiative.community_streak} días</span>
            )}
          </div>
        </div>

        <button
          onClick={() => onJoin(initiative.id)}
          disabled={isJoining || isFull}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all ${
            isFull
              ? 'opacity-40 cursor-not-allowed'
              : isJoining
                ? 'opacity-50 cursor-not-allowed'
                : 'active:scale-95'
          }`}
          style={{
            backgroundColor: isFull ? undefined : initiative.color,
            color: isFull ? undefined : '#FFFFFF',
          }}
        >
          {isFull ? 'Lleno' : isJoining ? 'Uniendo...' : 'Unirse'}
        </button>
      </div>
    </div>
  );
}

export default function InitiativeDiscoverList({
  initiatives,
  joining,
  isDay,
  onJoin,
}: InitiativeDiscoverListProps): React.ReactElement {
  if (initiatives.length === 0) {
    return <InitiativeEmptyState type="discover" isDay={isDay} />;
  }

  return (
    <div className="space-y-2">
      {initiatives.map(initiative => (
        <DiscoverCard
          key={initiative.id}
          initiative={initiative}
          joining={joining}
          isDay={isDay}
          onJoin={onJoin}
        />
      ))}
    </div>
  );
}
