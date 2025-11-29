'use client';

import { useRouter } from 'next/navigation';
import { Target, Flame } from 'lucide-react';
import type { InitiativeListItem } from '@/types/initiative';

interface InitiativeCardProps {
  readonly initiative: InitiativeListItem;
  readonly isDay: boolean;
}

export default function InitiativeCard({
  initiative,
  isDay,
}: InitiativeCardProps): React.ReactElement {
  const router = useRouter();
  const rate = initiative.today_completion_rate;
  const bgColor = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const subtextColor = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const trackBg = isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10';

  return (
    <button
      onClick={() => router.push(`/initiatives/${initiative.id}`)}
      className={`w-full p-3 rounded-xl ${bgColor} text-left transition-all active:scale-[0.98]`}
    >
      <div className="flex items-center gap-3">
        <span className="flex-shrink-0 w-8 flex items-center justify-center" aria-hidden="true">
          {initiative.icon
            ? <span className="text-xl">{initiative.icon}</span>
            : <Target className="w-5 h-5" strokeWidth={2} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-medium truncate ${textColor}`}>
              {initiative.name}
            </span>
            {initiative.today_completed && (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" className="text-green-500 flex-shrink-0">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
              </svg>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${trackBg}`}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(rate, 100)}%`,
                  backgroundColor: rate >= 100 ? '#F59E0B' : initiative.color,
                }}
              />
            </div>
            <span className={`text-[10px] tabular-nums flex-shrink-0 ${subtextColor}`}>
              {rate}%
            </span>
          </div>
        </div>

        <div className={`flex flex-col items-end gap-0.5 flex-shrink-0 ${subtextColor}`}>
          {initiative.community_streak > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] tabular-nums">
              <Flame className="w-3.5 h-3.5 text-orange-400" strokeWidth={2} />
              {initiative.community_streak}
            </span>
          )}
          <span className="text-[10px] tabular-nums">
            {initiative.participant_count} {initiative.participant_count === 1 ? 'persona' : 'personas'}
          </span>
        </div>
      </div>
    </button>
  );
}
