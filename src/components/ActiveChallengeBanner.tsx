'use client';

import { useActiveChallenge } from '@/hooks/useActiveChallenge';

interface ActiveChallengeBannerProps {
  readonly isDay: boolean;
}

export default function ActiveChallengeBanner({ isDay }: ActiveChallengeBannerProps) {
  const { challenge, participantCount, loading } = useActiveChallenge();

  if (loading || !challenge) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  return (
    <div
      className={`mb-4 p-4 rounded-lg border-2 border-dashed transition-all duration-300 ${
        isDay
          ? 'border-[#4A2E1B]/30 bg-[#4A2E1B]/5'
          : 'border-[#F5F0E1]/30 bg-[#F5F0E1]/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🏆</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm">Reto Semanal</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isDay
                  ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]'
                  : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'
              }`}
            >
              {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'} restantes
            </span>
          </div>
          <p className="font-semibold text-sm mt-1">{challenge.title}</p>
          <p className="text-xs opacity-80 mt-0.5">{challenge.description}</p>
          <p className="text-xs opacity-60 mt-2">
            {participantCount} {participantCount === 1 ? 'participante' : 'participantes'}
          </p>
        </div>
      </div>
    </div>
  );
}
