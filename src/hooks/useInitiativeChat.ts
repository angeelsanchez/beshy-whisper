'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { InitiativeChatMessage } from '@/types/initiative';

interface ChatUserInfo {
  readonly name: string | null;
  readonly alias: string | null;
  readonly profilePhotoUrl: string | null;
}

interface ChatParticipant {
  readonly user_id: string;
  readonly name: string | null;
  readonly alias: string | null;
  readonly profile_photo_url: string | null;
}

interface UseInitiativeChatReturn {
  readonly messages: ReadonlyArray<InitiativeChatMessage>;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly hasMore: boolean;
  readonly sending: boolean;
  readonly error: string | null;
  readonly sendMessage: (content: string) => Promise<boolean>;
  readonly loadMore: () => Promise<void>;
}

export function useInitiativeChat(
  initiativeId: string,
  userId: string,
  currentUser: ChatUserInfo,
  participants: ReadonlyArray<ChatParticipant>,
): UseInitiativeChatReturn {
  const [messages, setMessages] = useState<InitiativeChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const participantMap = useMemo(() => {
    const map = new Map<string, { name: string | null; alias: string | null; photo: string | null }>();
    for (const p of participants) {
      map.set(p.user_id, { name: p.name, alias: p.alias, photo: p.profile_photo_url });
    }
    return map;
  }, [participants]);

  const participantMapRef = useRef(participantMap);
  participantMapRef.current = participantMap;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const fetchMessages = useCallback(async (cursor?: string): Promise<void> => {
    const isInitial = !cursor;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '30' });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/initiatives/${initiativeId}/messages?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Error cargando mensajes');
        return;
      }

      const data = await res.json();
      const fetched: InitiativeChatMessage[] = data.messages ?? [];
      setHasMore(data.hasMore ?? false);

      if (isInitial) {
        setMessages(fetched.reverse());
      } else {
        setMessages(prev => [...fetched.reverse(), ...prev]);
      }
      setError(null);
    } catch {
      setError('Error de conexión');
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [initiativeId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleRealtimeInsert = useCallback((payload: { new: Record<string, unknown> }): void => {
    const newMsg = payload.new as { id: string; initiative_id: string; user_id: string; content: string; created_at: string };

    if (pendingIdsRef.current.has(newMsg.id)) {
      pendingIdsRef.current.delete(newMsg.id);
      return;
    }

    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;

      const optimisticIdx = prev.findIndex(
        m => m.id.startsWith('temp-') && m.user_id === newMsg.user_id && m.content === newMsg.content
      );

      if (optimisticIdx !== -1) {
        const updated = [...prev];
        updated[optimisticIdx] = {
          ...updated[optimisticIdx],
          id: newMsg.id,
          created_at: newMsg.created_at,
        };
        return updated;
      }

      const cached = prev.find(m => m.user_id === newMsg.user_id && !m.id.startsWith('temp-'));
      const participant = participantMapRef.current.get(newMsg.user_id);

      return [...prev, {
        id: newMsg.id,
        initiative_id: newMsg.initiative_id,
        user_id: newMsg.user_id,
        content: newMsg.content,
        created_at: newMsg.created_at,
        user_name: cached?.user_name ?? participant?.name ?? null,
        user_alias: cached?.user_alias ?? participant?.alias ?? null,
        user_profile_photo_url: cached?.user_profile_photo_url ?? participant?.photo ?? null,
      }];
    });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`initiative-chat:${initiativeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'initiative_messages',
        filter: `initiative_id=eq.${initiativeId}`,
      }, handleRealtimeInsert)
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [initiativeId, handleRealtimeInsert]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    setSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMsg: InitiativeChatMessage = {
      id: tempId,
      initiative_id: initiativeId,
      user_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      user_name: currentUserRef.current.name,
      user_alias: currentUserRef.current.alias,
      user_profile_photo_url: currentUserRef.current.profilePhotoUrl,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/initiatives/${initiativeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Error enviando mensaje');
        return false;
      }

      const data = await res.json();
      const realMsg: InitiativeChatMessage = data.message;

      pendingIdsRef.current.add(realMsg.id);

      setMessages(prev =>
        prev.map(m => m.id === tempId ? realMsg : m)
      );

      return true;
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError('Error de conexión');
      return false;
    } finally {
      setSending(false);
    }
  }, [initiativeId, userId]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest || oldest.id.startsWith('temp-')) return;
    await fetchMessages(oldest.created_at);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  return { messages, loading, loadingMore, hasMore, sending, error, sendMessage, loadMore };
}
