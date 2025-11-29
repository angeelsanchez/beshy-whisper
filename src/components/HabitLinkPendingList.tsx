'use client';

import { useState } from 'react';
import { Check, X, Loader2, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import type { HabitLink } from '@/hooks/useHabitLinks';
import Avatar from '@/components/Avatar';
import AppIcon from '@/components/AppIcon';

interface HabitLinkPendingListProps {
  readonly pendingReceived: HabitLink[];
  readonly pendingSent: HabitLink[];
  readonly isDay: boolean;
  readonly onRespond: (linkId: string, action: 'accept' | 'decline') => Promise<boolean>;
  readonly onCancel: (linkId: string) => Promise<boolean>;
}

export default function HabitLinkPendingList({
  pendingReceived,
  pendingSent,
  isDay,
  onRespond,
  onCancel,
}: HabitLinkPendingListProps): React.ReactElement | null {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  if (pendingReceived.length === 0 && pendingSent.length === 0) return null;

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const muted = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const cardBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';

  const handleAccept = async (linkId: string): Promise<void> => {
    setProcessingId(linkId);
    await onRespond(linkId, 'accept');
    setProcessingId(null);
  };

  const handleDecline = async (linkId: string): Promise<void> => {
    setProcessingId(linkId);
    await onRespond(linkId, 'decline');
    setProcessingId(null);
  };

  const handleCancel = async (linkId: string): Promise<void> => {
    setProcessingId(linkId);
    await onCancel(linkId);
    setProcessingId(null);
  };

  return (
    <div className={`rounded-xl ${cardBg} ${text} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center relative ${
            isDay ? 'bg-amber-500/15' : 'bg-amber-400/15'
          }`}>
            <Bell className={`w-4 h-4 ${isDay ? 'text-amber-600' : 'text-amber-400'}`} strokeWidth={2} />
            {pendingReceived.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingReceived.length}
              </span>
            )}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold">
              Invitaciones a hábitos
            </h3>
            {!expanded && (
              <p className={`text-[11px] ${muted}`}>
                {pendingReceived.length > 0
                  ? `${pendingReceived.length} invitación${pendingReceived.length > 1 ? 'es' : ''} pendiente${pendingReceived.length > 1 ? 's' : ''}`
                  : `${pendingSent.length} enviada${pendingSent.length > 1 ? 's' : ''}`
                }
              </p>
            )}
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
        }`}>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
          }
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {pendingReceived.length > 0 && (
            <div className="space-y-3">
              <p className={`text-[11px] font-medium ${muted}`}>Te invitan a unirte</p>
              {pendingReceived.map(link => {
                const requesterName = link.requester.name || link.requester.alias;
                const isProcessing = processingId === link.id;
                const habit = link.requester_habit;

                return (
                  <div
                    key={link.id}
                    className={`p-3 rounded-xl border ${
                      isDay ? 'border-[#4A2E1B]/10 bg-white/50' : 'border-[#F5F0E1]/10 bg-[#3A2723]/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar
                        src={link.requester.profile_photo_url}
                        name={requesterName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          <span className="font-medium">{requesterName}</span>
                          <span className={muted}> te invita a hacer juntos:</span>
                        </p>
                        {link.message && (
                          <p className={`text-[11px] mt-1 italic ${muted}`}>
                            &ldquo;{link.message}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 mb-3 rounded-lg ${
                      isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
                    }`}>
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: habit.color }}
                      >
                        {habit.icon && (
                          <AppIcon identifier={habit.icon} className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{habit.name}</p>
                        <p className={`text-[10px] ${muted}`}>
                          Se añadirá a tus hábitos si aceptas
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(link.id)}
                        disabled={isProcessing}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          isProcessing
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:opacity-90 active:scale-[0.98]'
                        } ${isDay ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        )}
                        Unirme
                      </button>
                      <button
                        onClick={() => handleDecline(link.id)}
                        disabled={isProcessing}
                        className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                          isProcessing ? 'opacity-40' : 'hover:opacity-90'
                        } ${isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'}`}
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pendingSent.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[11px] font-medium ${muted}`}>Enviadas por ti</p>
              {pendingSent.map(link => {
                const responderName = link.responder.name || link.responder.alias;
                const isProcessing = processingId === link.id;
                return (
                  <div
                    key={link.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border opacity-70 ${
                      isDay ? 'border-[#4A2E1B]/10 bg-white/30' : 'border-[#F5F0E1]/10 bg-[#3A2723]/20'
                    }`}
                  >
                    <Avatar
                      src={link.responder.profile_photo_url}
                      name={responderName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium">{link.requester_habit.name}</span>
                        <span className={muted}> → </span>
                        <span className="font-medium">{responderName}</span>
                      </p>
                      <span className={`text-[10px] ${muted}`}>Esperando respuesta...</span>
                    </div>
                    <button
                      onClick={() => handleCancel(link.id)}
                      disabled={isProcessing}
                      className={`text-[10px] px-2 py-1.5 rounded-md font-medium transition-all ${
                        isDay ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                      }`}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancelar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
