'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, X, Check, UserPlus, Loader2 } from 'lucide-react';
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
  const cardBg = isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5';
  const borderColor = isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10';

  if (loading) {
    return (
      <div className={`p-4 rounded-xl ${cardBg} ${text}`}>
        <div className="flex items-center gap-2 text-xs opacity-50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Cargando vinculaciones...
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl ${cardBg} ${text} space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Link2 className="w-4 h-4" strokeWidth={2} />
          Hazlo en compañía
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
            isDay
              ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#4A2E1B]/90'
              : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#F5F0E1]/90'
          }`}
        >
          <UserPlus className="w-3 h-3" strokeWidth={2} />
          Invitar
        </button>
      </div>

      {linksForThisHabit.length === 0 && pendingForThisHabit.length === 0 ? (
        <p className="text-xs opacity-50 py-2">
          Invita a alguien a hacer este hábito contigo y motivaos mutuamente.
        </p>
      ) : (
        <div className="space-y-2">
          {linksForThisHabit.map(link => {
            const isRequester = link.requester_id === currentUserId;
            const partner = isRequester ? link.responder : link.requester;
            const partnerCompleted = link.partner_completed_today;

            return (
              <div
                key={link.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${borderColor}`}
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
                  <span className="text-[10px] opacity-50 flex items-center gap-1">
                    {partnerCompleted ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" strokeWidth={2.5} />
                        Completado hoy
                      </>
                    ) : (
                      'Pendiente hoy'
                    )}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  disabled={deleting === link.id}
                  className="p-1.5 rounded-lg opacity-40 hover:opacity-70 transition-opacity disabled:opacity-20"
                  title="Desvincular"
                >
                  {deleting === link.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            );
          })}

          {pendingForThisHabit.map(link => (
            <div
              key={link.id}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${borderColor} opacity-60`}
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
                <span className="text-[10px] opacity-70">Solicitud pendiente...</span>
              </div>
              <button
                onClick={() => handleDeleteLink(link.id)}
                disabled={deleting === link.id}
                className="p-1.5 rounded-lg opacity-40 hover:opacity-70 transition-opacity disabled:opacity-20"
                title="Cancelar solicitud"
              >
                {deleting === link.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                )}
              </button>
            </div>
          ))}
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
