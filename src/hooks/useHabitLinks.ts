'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';

interface UserInfo {
  name: string | null;
  alias: string;
  profile_photo_url: string | null;
}

interface HabitInfo {
  name: string;
  icon: string | null;
  color: string;
}

export interface HabitLink {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  created_at: string;
  responded_at: string | null;
  requester_id: string;
  responder_id: string;
  requester_habit_id: string;
  responder_habit_id: string | null;
  requester: UserInfo;
  responder: UserInfo;
  requester_habit: HabitInfo;
  responder_habit: HabitInfo | null;
  partner_completed_today: boolean;
}

export function useHabitLinks() {
  const { session } = useAuthSession();
  const [links, setLinks] = useState<HabitLink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

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
  }, [session?.user?.id]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const requestLink = useCallback(async (
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
  }, [fetchLinks]);

  const respondToLink = useCallback(async (
    linkId: string,
    action: 'accept' | 'decline',
    responderHabitId?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/habits/links/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, action, responderHabitId }),
      });
      if (!res.ok) return false;
      await fetchLinks();
      return true;
    } catch {
      return false;
    }
  }, [fetchLinks]);

  const deleteLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/habits/links/${linkId}`, { method: 'DELETE' });
      if (!res.ok) return false;
      setLinks(prev => prev.filter(l => l.id !== linkId));
      return true;
    } catch {
      return false;
    }
  }, []);

  const userId = session?.user?.id;
  const pendingReceived = links.filter(l => l.status === 'pending' && l.responder_id === userId);
  const pendingSent = links.filter(l => l.status === 'pending' && l.requester_id === userId);
  const activeLinks = links.filter(l => l.status === 'accepted');

  return {
    links,
    loading,
    pendingReceived,
    pendingSent,
    activeLinks,
    requestLink,
    respondToLink,
    deleteLink,
    refetch: fetchLinks,
  };
}
