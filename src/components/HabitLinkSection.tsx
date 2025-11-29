'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, X, Check, UserPlus, Loader2, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
import type { Habit } from '@/hooks/useHabits';
import type { HabitLink } from '@/hooks/useHabitLinks';
import Avatar from '@/components/Avatar';
import HabitLinkRequestModal from '@/components/HabitLinkRequestModal';

interface HabitLinkSectionProps {
  readonly habitId: string;
  readonly habits: Habit[];
  readonly isDay: boolean;
  readonly currentUserId: string;
}

export default function HabitLinkSection({
  habitId,
  habits,
  isDay,
  currentUserId,
}: HabitLinkSectionProps): React.ReactElement {
  const [links, setLinks] = useState<HabitLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/habits/links');
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const linksForThisHabit = links.filter(
    link =>
      link.status === 'accepted' &&
      (link.requester_habit_id === habitId || link.responder_habit_id === habitId)
  );

  const pendingForThisHabit = links.filter(
    link =>
      link.status === 'pending' &&
      link.requester_habit_id === habitId &&
      link.requester_id === currentUserId
  );

  const hasActiveLinks = linksForThisHabit.length > 0;
  const hasPending = pendingForThisHabit.length > 0;

  const handleRequestLink = async (
    responderId: string,
    requesterHabitId: string,
    message?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/habits/links/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responderId, requesterHabitId, message }),
      });
      if (!res.ok) return false;
      await fetchLinks();
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteLink = async (linkId: string): Promise<void> => {
    setDeleting(linkId);
    try {
      const res = await fetch(`/api/habits/links/${linkId}`, { method: 'DELETE' });
      if (res.ok) {
        setLinks(prev => prev.filter(l => l.id !== linkId));
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const muted = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const cardBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';

  if (loading) {
    return (
      <div className={`p-4 rounded-xl ${cardBg} ${text}`}>
        <div className="flex items-center gap-2 text-xs opacity-50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl ${cardBg} ${text} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
          }`}>
            <Users className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold flex items-center gap-2">
              Compañero de hábito
              {hasActiveLinks && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isDay ? 'bg-green-600/15 text-green-700' : 'bg-green-400/15 text-green-400'
                }`}>
                  {linksForThisHabit.length} {linksForThisHabit.length === 1 ? 'activo' : 'activos'}
                </span>
              )}
              {!hasActiveLinks && hasPending && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isDay ? 'bg-amber-600/15 text-amber-700' : 'bg-amber-400/15 text-amber-400'
                }`}>
                  Pendiente
                </span>
              )}
            </h3>
            {!expanded && (
              <p className={`text-[11px] ${muted}`}>
                {hasActiveLinks
                  ? `${linksForThisHabit.map(l => {
                      const isRequester = l.requester_id === currentUserId;
                      const partner = isRequester ? l.responder : l.requester;
                      return partner.name || partner.alias;
                    }).join(', ')}`
                  : 'Es más difícil abandonar si alguien cuenta contigo'
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
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            isDay ? 'bg-blue-500/10' : 'bg-blue-400/10'
          }`}>
            <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              isDay ? 'text-blue-600' : 'text-blue-400'
            }`} strokeWidth={2} />
            <p className={`text-[11px] leading-relaxed ${
              isDay ? 'text-blue-800' : 'text-blue-300'
            }`}>
Cuando alguien cuenta contigo, es más difícil abandonar. Invita a alguien y comprometeos con el mismo objetivo.
            </p>
          </div>

          {linksForThisHabit.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[11px] font-medium ${muted}`}>Haciendo este hábito contigo</p>
              {linksForThisHabit.map(link => {
                const isRequester = link.requester_id === currentUserId;
                const partner = isRequester ? link.responder : link.requester;
                const partnerCompleted = link.partner_completed_today;

                return (
                  <div
                    key={link.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isDay ? 'border-[#4A2E1B]/10 bg-white/50' : 'border-[#F5F0E1]/10 bg-[#3A2723]/30'
                    }`}
                  >
                    <Avatar
                      src={partner.profile_photo_url}
                      name={partner.name || partner.alias}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block truncate">
                        {partner.name || partner.alias}
                      </span>
                      <span className={`text-[10px] flex items-center gap-1 ${
                        partnerCompleted
                          ? (isDay ? 'text-green-700' : 'text-green-400')
                          : muted
                      }`}>
                        {partnerCompleted ? (
                          <>
                            <Check className="w-3 h-3" strokeWidth={2.5} />
                            Ha completado hoy
                          </>
                        ) : (
                          'Pendiente hoy'
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      disabled={deleting === link.id}
                      className={`p-2 rounded-lg transition-all ${
                        isDay
                          ? 'hover:bg-red-500/10 text-[#4A2E1B]/30 hover:text-red-600'
                          : 'hover:bg-red-400/10 text-[#F5F0E1]/30 hover:text-red-400'
                      } disabled:opacity-20`}
                      title="Desvincular"
                    >
                      {deleting === link.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pendingForThisHabit.length > 0 && (
            <div className="space-y-2">
              <p className={`text-[11px] font-medium ${muted}`}>Esperando respuesta</p>
              {pendingForThisHabit.map(link => (
                <div
                  key={link.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border opacity-70 ${
                    isDay ? 'border-[#4A2E1B]/10 bg-white/30' : 'border-[#F5F0E1]/10 bg-[#3A2723]/20'
                  }`}
                >
                  <Avatar
                    src={link.responder.profile_photo_url}
                    name={link.responder.name || link.responder.alias}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium block truncate">
                      {link.responder.name || link.responder.alias}
                    </span>
                    <span className={`text-[10px] flex items-center gap-1 ${muted}`}>
                      <Clock className="w-3 h-3" />
                      Solicitud enviada
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    disabled={deleting === link.id}
                    className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                      isDay ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-900/20'
                    }`}
                  >
                    {deleting === link.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Cancelar'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              isDay
                ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A2415] active:scale-[0.98]'
                : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1] active:scale-[0.98]'
            }`}
          >
            <UserPlus className="w-4 h-4" strokeWidth={2} />
            Invitar a alguien
          </button>
        </div>
      )}

      <HabitLinkRequestModal
        isOpen={showModal}
        isDay={isDay}
        myHabits={habits}
        preSelectedHabitId={habitId}
        onClose={() => setShowModal(false)}
        onSubmit={handleRequestLink}
      />
    </div>
  );
}
