'use client';

import { useState, useCallback } from 'react';
import { useInitiatives } from '@/hooks/useInitiatives';
import InitiativeCard from './InitiativeCard';
import InitiativeDiscoverList from './InitiativeDiscoverList';
import InitiativeEmptyState from './InitiativeEmptyState';

interface CommunityTabProps {
  readonly isDay: boolean;
}

export default function CommunityTab({ isDay }: CommunityTabProps): React.ReactElement {
  const {
    joinedInitiatives,
    availableInitiatives,
    loading,
    join,
  } = useInitiatives();

  const [joining, setJoining] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';

  const showToastMsg = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const handleJoin = useCallback(async (initiativeId: string) => {
    setJoining(initiativeId);
    const success = await join(initiativeId);
    setJoining(null);
    if (success) {
      showToastMsg('Te has unido a la iniciativa');
    }
  }, [join, showToastMsg]);

  if (loading) {
    return (
      <div className={`text-center py-12 text-sm ${subtextColor}`}>
        Cargando iniciativas...
      </div>
    );
  }

  const hasJoined = joinedInitiatives.length > 0;
  const hasAvailable = availableInitiatives.length > 0;

  if (!hasJoined && !hasAvailable) {
    return <InitiativeEmptyState type="all" isDay={isDay} />;
  }

  return (
    <>
      <div className="space-y-4">
        {hasJoined && (
          <section>
            <h2 className={`text-sm font-semibold mb-2 ${textColor}`}>
              Mis Iniciativas
            </h2>
            <div className="space-y-2">
              {joinedInitiatives.map(initiative => (
                <InitiativeCard
                  key={initiative.id}
                  initiative={initiative}
                  isDay={isDay}
                />
              ))}
            </div>
          </section>
        )}

        {!hasJoined && hasAvailable && (
          <InitiativeEmptyState type="joined" isDay={isDay} />
        )}

        {hasAvailable && (
          <section>
            <h2 className={`text-sm font-semibold mb-2 ${textColor}`}>
              Descubrir
            </h2>
            <InitiativeDiscoverList
              initiatives={availableInitiatives}
              joining={joining}
              isDay={isDay}
              onJoin={handleJoin}
            />
          </section>
        )}
      </div>

      {showToast && (
        <div
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          className="fixed left-1/2 transform -translate-x-1/2 bg-[#4A2E1B] text-[#F5F0E1] px-6 py-3 rounded-lg shadow-lg opacity-90 z-[70]"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
