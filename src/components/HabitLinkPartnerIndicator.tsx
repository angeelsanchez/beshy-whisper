'use client';

import { Check, X, Link2 } from 'lucide-react';
import type { HabitLink } from '@/hooks/useHabitLinks';

interface HabitLinkPartnerIndicatorProps {
  readonly link: HabitLink;
  readonly currentUserId: string;
  readonly isDay: boolean;
}

export default function HabitLinkPartnerIndicator({
  link,
  currentUserId,
  isDay,
}: HabitLinkPartnerIndicatorProps): React.ReactElement {
  const isRequester = link.requester_id === currentUserId;
  const partner = isRequester ? link.responder : link.requester;
  const partnerName = partner.name || partner.alias;
  const completedToday = link.partner_completed_today;

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] ${
      isDay ? 'bg-[#4A2E1B]/5 text-[#4A2E1B]/70' : 'bg-[#F5F0E1]/5 text-[#F5F0E1]/70'
    }`}>
      <Link2 className="w-3 h-3 flex-shrink-0 opacity-50" strokeWidth={2} />
      <span className="truncate flex-1 min-w-0">{partnerName}</span>
      {completedToday ? (
        <Check className="w-3.5 h-3.5 flex-shrink-0 text-green-500" strokeWidth={2.5} />
      ) : (
        <X className="w-3.5 h-3.5 flex-shrink-0 opacity-30" strokeWidth={2.5} />
      )}
    </div>
  );
}
