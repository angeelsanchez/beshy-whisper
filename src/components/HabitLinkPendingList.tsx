'use client';

import { useState } from 'react';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import type { HabitLink } from '@/hooks/useHabitLinks';
import type { Habit } from '@/hooks/useHabits';

interface HabitLinkPendingListProps {
  readonly pendingReceived: HabitLink[];
  readonly pendingSent: HabitLink[];
  readonly myHabits: Habit[];
  readonly isDay: boolean;
  readonly onRespond: (linkId: string, action: 'accept' | 'decline', habitId?: string) => Promise<boolean>;
  readonly onCancel: (linkId: string) => Promise<boolean>;
}

export default function HabitLinkPendingList({
  pendingReceived,
  pendingSent,
  myHabits,
  isDay,
  onRespond,
  onCancel,
}: HabitLinkPendingListProps): React.ReactElement | null {
  const [selectedHabits, setSelectedHabits] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (pendingReceived.length === 0 && pendingSent.length === 0) return null;

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const textMuted = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
  const bg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';

  const handleAccept = async (linkId: string): Promise<void> => {
    const habitId = selectedHabits[linkId];
    if (!habitId) return;
    setProcessingId(linkId);
    await onRespond(linkId, 'accept', habitId);
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
    <div className="space-y-3">
      {pendingReceived.length > 0 && (
        <div>
          <h4 className={`text-xs font-semibold mb-2 ${text}`}>Solicitudes recibidas</h4>
          <div className="space-y-2">
            {pendingReceived.map(link => {
              const requesterName = link.requester.name || link.requester.alias;
              const isProcessing = processingId === link.id;
              return (
                <div key={link.id} className={`p-3 rounded-lg ${bg}`}>
                  <div className={`text-xs mb-1.5 ${text}`}>
                    <span className="font-medium">{requesterName}</span>
                    <span className={`${textMuted}`}> quiere vincular </span>
                    <span className="font-medium">{link.requester_habit.name}</span>
                  </div>
                  {link.message && (
                    <p className={`text-[11px] mb-2 italic ${textMuted}`}>
                      &ldquo;{link.message}&rdquo;
                    </p>
                  )}

                  <div className="mb-2">
                    <label htmlFor={`habit-select-${link.id}`} className="sr-only">Selecciona tu hábito</label>
                    <select
                      id={`habit-select-${link.id}`}
                      value={selectedHabits[link.id] || ''}
                      onChange={(e) => setSelectedHabits(prev => ({ ...prev, [link.id]: e.target.value }))}
                      className={`w-full text-xs p-2 rounded-md border ${
                        isDay
                          ? 'bg-white border-[#4A2E1B]/20 text-[#4A2E1B]'
                          : 'bg-[#3A2723] border-[#F5F0E1]/20 text-[#F5F0E1]'
                      }`}
                    >
                      <option value="">Elige tu hábito para vincular...</option>
                      {myHabits.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(link.id)}
                      disabled={isProcessing || !selectedHabits[link.id]}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        !selectedHabits[link.id] || isProcessing
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:opacity-90'
                      } ${isDay ? 'bg-green-600 text-white' : 'bg-green-500 text-white'}`}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2.5} />}
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleDecline(link.id)}
                      disabled={isProcessing}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        isProcessing ? 'opacity-40' : 'hover:opacity-90'
                      } ${isDay ? 'bg-[#4A2E1B]/10 text-[#4A2E1B]' : 'bg-[#F5F0E1]/10 text-[#F5F0E1]'}`}
                    >
                      <X className="w-3 h-3" strokeWidth={2.5} />
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingSent.length > 0 && (
        <div>
          <h4 className={`text-xs font-semibold mb-2 ${text}`}>Solicitudes enviadas</h4>
          <div className="space-y-2">
            {pendingSent.map(link => {
              const responderName = link.responder.name || link.responder.alias;
              const isProcessing = processingId === link.id;
              return (
                <div key={link.id} className={`flex items-center gap-2 p-3 rounded-lg ${bg}`}>
                  <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${textMuted}`} strokeWidth={2} />
                  <div className={`flex-1 min-w-0 text-xs ${text}`}>
                    <span className="font-medium">{link.requester_habit.name}</span>
                    <span className={`${textMuted}`}> → {responderName}</span>
                  </div>
                  <button
                    onClick={() => handleCancel(link.id)}
                    disabled={isProcessing}
                    className={`text-[10px] px-2 py-1 rounded-md ${
                      isDay ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                    }`}
                  >
                    {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancelar'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
