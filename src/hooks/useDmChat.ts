'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DirectMessage, ConversationParticipant } from '@/types/dm';

interface ChatUserInfo {
  readonly name: string | null;
  readonly alias: string | null;
  readonly profilePhotoUrl: string | null;
}

interface UseDmChatReturn {
  readonly messages: ReadonlyArray<DirectMessage>;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly hasMore: boolean;
  readonly sending: boolean;
  readonly error: string | null;
  readonly sendMessage: (content: string) => Promise<boolean>;
  readonly loadMore: () => Promise<void>;
}

export function useDmChat(
  conversationId: string,
  userId: string,
  currentUser: ChatUserInfo,
  otherUser: ConversationParticipant
): UseDmChatReturn {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingIdsRef = useRef<Set<string>>(new Set());

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const otherUserRef = useRef(otherUser);
  otherUserRef.current = otherUser;

  const fetchMessages = useCallback(
    async (cursor?: string): Promise<void> => {
      const isInitial = !cursor;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({ limit: '30' });
        if (cursor) params.set('cursor', cursor);

        const res = await fetch(`/api/messages/${conversationId}?${params}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Error cargando mensajes');
          return;
        }

        const data = await res.json();
        const fetched: DirectMessage[] = data.messages ?? [];
        setHasMore(data.hasMore ?? false);

        if (isInitial) {
          setMessages(fetched.reverse());
        } else {
          setMessages((prev) => [...fetched.reverse(), ...prev]);
        }
        setError(null);
      } catch {
        setError('Error de conexion');
      } finally {
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleRealtimeInsert = useCallback(
    (payload: { new: Record<string, unknown> }): void => {
      const newMsg = payload.new as {
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        read_at: string | null;
        created_at: string;
      };

      if (newMsg.conversation_id !== conversationId) return;

      if (pendingIdsRef.current.has(newMsg.id)) {
        pendingIdsRef.current.delete(newMsg.id);
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;

        const optimisticIdx = prev.findIndex(
          (m) =>
            m.id.startsWith('temp-') &&
            m.sender_id === newMsg.sender_id &&
            m.content === newMsg.content
        );

        if (optimisticIdx !== -1) {
          const updated = [...prev];
          updated[optimisticIdx] = {
            ...updated[optimisticIdx],
            id: newMsg.id,
            read_at: newMsg.read_at,
            created_at: newMsg.created_at,
          };
          return updated;
        }

        const isSender = newMsg.sender_id === userId;

        const senderName = isSender
          ? currentUserRef.current.name
          : otherUserRef.current.name;
        const senderAlias = isSender
          ? currentUserRef.current.alias
          : otherUserRef.current.alias;
        const senderPhoto = isSender
          ? currentUserRef.current.profilePhotoUrl
          : otherUserRef.current.profile_photo_url;

        return [
          ...prev,
          {
            id: newMsg.id,
            conversation_id: newMsg.conversation_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            read_at: newMsg.read_at,
            created_at: newMsg.created_at,
            sender_name: senderName,
            sender_alias: senderAlias,
            sender_profile_photo_url: senderPhoto,
          },
        ];
      });
    },
    [conversationId, userId]
  );

  useEffect(() => {
    const channel = supabase
      .channel(`dm-chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        handleRealtimeInsert
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [conversationId, handleRealtimeInsert]);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      setSending(true);
      setError(null);

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMsg: DirectMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: userId,
        content: content.trim(),
        read_at: null,
        created_at: new Date().toISOString(),
        sender_name: currentUserRef.current.name,
        sender_alias: currentUserRef.current.alias,
        sender_profile_photo_url: currentUserRef.current.profilePhotoUrl,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      try {
        const res = await fetch(`/api/messages/${conversationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });

        if (!res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Error enviando mensaje');
          return false;
        }

        const data = await res.json();
        const realMsg: DirectMessage = data.message;

        pendingIdsRef.current.add(realMsg.id);

        setMessages((prev) => prev.map((m) => (m.id === tempId ? realMsg : m)));

        return true;
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError('Error de conexion');
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, userId]
  );

  const loadMore = useCallback(async (): Promise<void> => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest || oldest.id.startsWith('temp-')) return;
    await fetchMessages(oldest.created_at);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    sending,
    error,
    sendMessage,
    loadMore,
  };
}
