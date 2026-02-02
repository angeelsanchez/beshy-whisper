'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/utils/user-helpers';
import { useSession } from 'next-auth/react';

export interface EntryWithUser {
  id: string;
  user_id: string | null;
  nombre: string;
  mensaje: string;
  fecha: string;
  ip: string;
  franja: 'DIA' | 'NOCHE';
  guest: boolean;
  users?: {
    alias: string;
    name?: string;
    profile_photo_url?: string | null;
  };
  display_id: string;
  display_name: string;
  likes_count: number;
  user_has_liked?: boolean;
  has_objectives: boolean;
  edited?: boolean;
  is_private?: boolean;
  profile_photo_url?: string | null;
}

interface PostContextType {
  entries: EntryWithUser[];
  addLocalPost: (post: EntryWithUser) => void;
  refreshPosts: () => Promise<void>;
  loading: boolean;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<EntryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const entriesRef = useRef<EntryWithUser[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const fetchLikesCounts = useCallback(async (entriesArray: EntryWithUser[]) => {
    if (!entriesArray.length) return;
    
    try {
      const entryIds = entriesArray.map(entry => entry.id).filter(Boolean);
      if (!entryIds.length) return;
      
      const [likesResponse, userLikesResponse] = await Promise.all([
        supabase.from('likes').select('entry_id').in('entry_id', entryIds),
        currentUserId 
          ? supabase.from('likes')
              .select('entry_id')
              .eq('user_id', currentUserId)
              .in('entry_id', entryIds)
          : null
      ]);

      const likesCountMap = new Map<string, number>();
      if (!likesResponse.error && likesResponse.data) {
        likesResponse.data.forEach(like => {
          if (like?.entry_id) {
            likesCountMap.set(like.entry_id, (likesCountMap.get(like.entry_id) || 0) + 1);
          }
        });
      }

      const userLikesMap = new Map<string, boolean>();
      if (userLikesResponse && !userLikesResponse.error && userLikesResponse.data) {
        userLikesResponse.data.forEach(like => {
          if (like?.entry_id) userLikesMap.set(like.entry_id, true);
        });
      }

      setEntries(prevEntries => prevEntries.map(entry => ({
        ...entry,
        likes_count: entry.id ? (likesCountMap.get(entry.id) || 0) : 0,
        user_has_liked: entry.id ? userLikesMap.has(entry.id) : false
      })));
    } catch (err) {
      console.error('Error processing likes data:', err);
    }
  }, [currentUserId]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select(`
          *,
          users:user_id (
            alias,
            name,
            profile_photo_url
          )
        `)
        .order('fecha', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error fetching entries:', error);
        return;
      }
      
      if (data) {
        const formattedEntries = data.map((entry) => {
          if (!entry.id) {
            console.warn('Entry missing ID:', entry);
            return null;
          }
          
          let display_id;
          let display_name;
          
          if (entry.user_id && entry.users?.alias) {
            display_id = entry.users.alias;
            display_name = entry.users.name || `Usuario ${entry.users.alias}`;
          } else {
            const guestName = entry.nombre && entry.nombre.trim() ? entry.nombre.trim() : "Anónimo";
            display_id = `${guestName} (Invitado)`;
            display_name = guestName;
          }
            
          return {
            ...entry,
            display_id,
            display_name,
            likes_count: 0,
            has_objectives: entry.franja === 'DIA',
            profile_photo_url: entry.users?.profile_photo_url ?? null,
          };
        }).filter((entry): entry is EntryWithUser => entry !== null);
        
        const currentUserId = await getCurrentUserId(session);
        const filteredEntries = formattedEntries.filter(entry => 
          !entry.is_private || 
          entry.user_id === currentUserId
        );
        
        setEntries(filteredEntries);
        await fetchLikesCounts(filteredEntries);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  }, [session, fetchLikesCounts]);

  const addLocalPost = useCallback((post: EntryWithUser) => {
    setEntries(prevEntries => [post, ...prevEntries]);
    
    if (post.id.startsWith('temp-')) {
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('entries')
            .select(`
              *,
              users:user_id (
                alias,
                name
              )
            `)
            .eq('user_id', post.user_id)
            .eq('mensaje', post.mensaje)
            .order('fecha', { ascending: false })
            .limit(1);
          
          if (error) {
            console.error('Error fetching real post:', error);
            return;
          }
          
          if (data && data.length > 0) {
            const realPost = data[0];
            setEntries(prevEntries => 
              prevEntries.map(entry => 
                entry.id === post.id ? {
                  ...entry,
                  id: realPost.id
                } : entry
              )
            );
            
            await fetchLikesCounts(entriesRef.current);
          }
        } catch (err) {
          console.error('Error updating temporary post:', err);
        }
      }, 1000);
    }
  }, [fetchLikesCounts]);

  const handleLikesChange = useCallback((payload: { new: Record<string, string> | null; old: Record<string, string> | null; eventType: string }) => {
    const { new: newLike, old: oldLike, eventType } = payload;
    const entryId = newLike?.entry_id || oldLike?.entry_id;
    if (!entryId || !entriesRef.current.length) return;

    setEntries(prevEntries => prevEntries.map(entry => {
      if (entry.id !== entryId) return entry;
      const delta = eventType === 'INSERT' ? 1 : eventType === 'DELETE' ? -1 : 0;
      const userHasLiked = eventType === 'INSERT' && newLike?.user_id === currentUserId;
      return {
        ...entry,
        likes_count: Math.max(0, entry.likes_count + delta),
        user_has_liked: userHasLiked
      };
    }));
  }, [currentUserId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const handleRealtimeError = (status: string, err?: Error) => {
      if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Realtime subscription issue:', status);
      }
    };

    try {
      const entriesChannel = supabase
        .channel('public:entries')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entries' }, (payload) => {
          const newPostUserId = payload.new.user_id;
          if (newPostUserId !== currentUserId) {
            fetchEntries();
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'entries' }, (payload) => {
          const deletedEntryId = payload.old.id;
          if (deletedEntryId) {
            setEntries(prevEntries => prevEntries.filter(entry => entry.id !== deletedEntryId));
          }
        })
        .subscribe(handleRealtimeError);
      channels.push(entriesChannel);

      const likesChannel = supabase
        .channel('public:likes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, (payload) => {
          handleLikesChange({ ...payload, eventType: 'INSERT' });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, (payload) => {
          handleLikesChange({ ...payload, eventType: 'DELETE' });
        })
        .subscribe(handleRealtimeError);
      channels.push(likesChannel);
    } catch {
      console.warn('Realtime subscriptions unavailable');
    }

    return () => {
      channels.forEach(ch => {
        try { supabase.removeChannel(ch); } catch { /* ignore */ }
      });
    };
  }, [currentUserId, fetchEntries, handleLikesChange]);

  return (
    <PostContext.Provider value={{ 
      entries, 
      addLocalPost, 
      refreshPosts: fetchEntries,
      loading 
    }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePostContext() {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePostContext must be used within a PostProvider');
  }
  return context;
}
