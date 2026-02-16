'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/utils/user-helpers';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/logger';

export interface EntryWithUser {
  id: string;
  user_id: string | null;
  nombre: string;
  mensaje: string;
  fecha: string;
  ip: string;
  franja: 'DIA' | 'NOCHE' | 'SEMANA';
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
  reposts_count: number;
  user_has_reposted?: boolean;
  is_repost?: boolean;
  reposted_by?: {
    user_id: string;
    display_name: string;
    reposted_at: string;
  };
  has_objectives: boolean;
  edited?: boolean;
  is_private?: boolean;
  profile_photo_url?: string | null;
  mood?: string | null;
  challenge_id?: string | null;
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
      logger.error('Error processing likes data', { error: String(err) });
    }
  }, [currentUserId]);

  const fetchRepostsCounts = useCallback(async (entriesArray: EntryWithUser[]) => {
    if (!entriesArray.length) return;

    try {
      const entryIds = entriesArray.map(entry => entry.id).filter(Boolean);
      if (!entryIds.length) return;

      const [repostsResponse, userRepostsResponse] = await Promise.all([
        supabase.from('reposts').select('entry_id').in('entry_id', entryIds),
        currentUserId
          ? supabase.from('reposts')
              .select('entry_id')
              .eq('user_id', currentUserId)
              .in('entry_id', entryIds)
          : null,
      ]);

      const repostsCountMap = new Map<string, number>();
      if (!repostsResponse.error && repostsResponse.data) {
        repostsResponse.data.forEach(repost => {
          if (repost?.entry_id) {
            repostsCountMap.set(repost.entry_id, (repostsCountMap.get(repost.entry_id) || 0) + 1);
          }
        });
      }

      const userRepostsMap = new Map<string, boolean>();
      if (userRepostsResponse && !userRepostsResponse.error && userRepostsResponse.data) {
        userRepostsResponse.data.forEach(repost => {
          if (repost?.entry_id) userRepostsMap.set(repost.entry_id, true);
        });
      }

      setEntries(prevEntries => prevEntries.map(entry => ({
        ...entry,
        reposts_count: entry.id ? (repostsCountMap.get(entry.id) || 0) : 0,
        user_has_reposted: entry.id ? userRepostsMap.has(entry.id) : false,
      })));
    } catch (err) {
      logger.error('Error processing reposts data', { error: String(err) });
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
        logger.error('Error fetching entries', { error: String(error) });
        return;
      }
      
      if (data) {
        const formattedEntries = data.map((entry) => {
          if (!entry.id) {
            logger.warn('Entry missing ID');
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
            reposts_count: 0,
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
        await Promise.all([
          fetchLikesCounts(filteredEntries),
          fetchRepostsCounts(filteredEntries),
        ]);
      }
    } catch (err) {
      logger.error('Error fetching entries', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, [session, fetchLikesCounts, fetchRepostsCounts]);

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
            logger.error('Error fetching real post', { error: String(error) });
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
          logger.error('Error updating temporary post', { error: String(err) });
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

  const handleRepostsChange = useCallback((payload: { new: Record<string, string> | null; old: Record<string, string> | null; eventType: string }) => {
    const { new: newRepost, old: oldRepost, eventType } = payload;
    const entryId = newRepost?.entry_id || oldRepost?.entry_id;
    if (!entryId || !entriesRef.current.length) return;

    setEntries(prevEntries => prevEntries.map(entry => {
      if (entry.id !== entryId) return entry;
      const delta = eventType === 'INSERT' ? 1 : eventType === 'DELETE' ? -1 : 0;
      const userHasReposted = eventType === 'INSERT' && newRepost?.user_id === currentUserId;
      return {
        ...entry,
        reposts_count: Math.max(0, entry.reposts_count + delta),
        user_has_reposted: eventType === 'DELETE' && oldRepost?.user_id === currentUserId
          ? false
          : userHasReposted || entry.user_has_reposted,
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
        logger.warn('Realtime subscription issue', { status });
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

      const repostsChannel = supabase
        .channel('public:reposts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reposts' }, (payload) => {
          handleRepostsChange({ ...payload, eventType: 'INSERT' });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reposts' }, (payload) => {
          handleRepostsChange({ ...payload, eventType: 'DELETE' });
        })
        .subscribe(handleRealtimeError);
      channels.push(repostsChannel);
    } catch {
      logger.warn('Realtime subscriptions unavailable');
    }

    return () => {
      for (const ch of channels) {
        supabase.removeChannel(ch).catch(() => {});
      }
    };
  }, [currentUserId, fetchEntries, handleLikesChange, handleRepostsChange]);

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
