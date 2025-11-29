'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ConversationListItem } from '@/types/dm';

interface UseConversationsReturn {
  readonly conversations: ReadonlyArray<ConversationListItem>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly totalUnread: number;
  readonly refresh: () => Promise<void>;
}

export function useConversations(userId: string | undefined): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const isMountedRef = useRef(true);

  const fetchConversations = useCallback(async (): Promise<void> => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/messages/conversations');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Error cargando conversaciones');
        return;
      }

      const data = await res.json();
      if (isMountedRef.current) {
        setConversations(data.conversations ?? []);
        setTotalUnread(data.totalUnread ?? 0);
        setError(null);
      }
    } catch {
      if (isMountedRef.current) {
        setError('Error de conexion');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchConversations();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dm-updates:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [userId, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    totalUnread,
    refresh: fetchConversations,
  };
}
