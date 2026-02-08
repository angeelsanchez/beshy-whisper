'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthSession } from '@/hooks/useAuthSession';

import { getCurrentUserId } from '@/utils/user-helpers';
import { usePostContext, EntryWithUser } from '@/context/PostContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import LikeButton from './LikeButton';
import RepostButton from './RepostButton';
import ObjectivesList from './ObjectivesList';
import EntryHabitsDisplay from './EntryHabitsDisplay';
import FeedFilter from './FeedFilter';
import Avatar from './Avatar';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { isMood, getMoodEmoji } from '@/types/mood';
import { Repeat2 } from 'lucide-react';
import { useActiveChallenge } from '@/hooks/useActiveChallenge';

const SocialShareModal = dynamic(() => import('./SocialShareModal'), {
  ssr: false,
});

// WhisperLogo component with dynamic coloring
const WhisperLogo = ({ className = "h-6 w-auto", isDay }: { className?: string; isDay: boolean }) => (
  <Image
    src="/Whisper.svg"
    alt="Whisper"
    width={100}
    height={28}
    className={className}
    style={{
      filter: isDay 
        ? 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)' // Color #4A2E1B para día
        : 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)' // Color #F5F0E1 para noche
    }}
  />
);

// SVG icons
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#A9A9A9" viewBox="0 0 16 16">
    <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#A9A9A9" viewBox="0 0 16 16">
    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
  </svg>
);

// Custom share arrow icon (matching the provided image)
const ShareArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M14.734 15.8974L19.22 12.1374C19.3971 11.9927 19.4998 11.7761 19.4998 11.5474C19.4998 11.3187 19.3971 11.1022 19.22 10.9574L14.734 7.19743C14.4947 6.9929 14.1598 6.94275 13.8711 7.06826C13.5824 7.19377 13.3906 7.47295 13.377 7.78743V9.27043C7.079 8.17943 5.5 13.8154 5.5 16.9974C6.961 14.5734 10.747 10.1794 13.377 13.8154V15.3024C13.3888 15.6178 13.5799 15.8987 13.8689 16.0254C14.158 16.1521 14.494 16.1024 14.734 15.8974Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Three dots menu icon
const MenuDotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
  </svg>
);

// Edit icon
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
  </svg>
);

// Delete icon for trash button
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
  </svg>
);

// Lock icon for private posts
const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
  </svg>
);

// Globe icon for public posts
const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm.312-3.5h2.49c-.062-.89-.291-1.733-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
  </svg>
);

export default function Feed() {
  const { entries: allEntries, loading } = usePostContext();
  const [visibleEntries, setVisibleEntries] = useState<EntryWithUser[]>([]);
  const [error, setError] = useState('');
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [showLoadingError, setShowLoadingError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const { session, isAuthenticated } = useAuthSession();
  const { isDay } = useTheme();
  const currentUserId = getCurrentUserId(session);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  // Estado para la edición de posts
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null);
  const [socialShareModal, setSocialShareModal] = useState<{ isOpen: boolean; entry: EntryWithUser | null }>({
    isOpen: false,
    entry: null
  });
  const [privacyLoading, setPrivacyLoading] = useState<string | null>(null);
  const { challenge: activeChallenge } = useActiveChallenge();
  const [challengeEntryIds, setChallengeEntryIds] = useState<Set<string>>(new Set());
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [followingEntries, setFollowingEntries] = useState<EntryWithUser[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Check database connection with AbortController
  useEffect(() => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      setShowLoadingError(true);
    }, 3000); // Reduced timeout from 5 to 3 seconds

    const checkDbConnection = async () => {
      try {
        // Simple query to check connection
        const { error } = await supabase.from('entries').select('count', { count: 'exact', head: true });
        
        if (abortController.signal.aborted) return;
        
        if (error) {
          console.error('Database connection error:', error);
          setDbStatus('error');
          return;
        }
        
        setDbStatus('connected');
        clearTimeout(timeoutId);
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('Failed to check database connection:', err);
        setDbStatus('error');
      }
    };
    
    checkDbConnection();

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // Fetch following feed when filter changes
  useEffect(() => {
    if (feedFilter !== 'following' || !isAuthenticated) return;

    const controller = new AbortController();
    setFollowingLoading(true);

    const fetchFollowing = async () => {
      try {
        const res = await fetch('/api/feed?filter=following&limit=50', {
          signal: controller.signal,
        });
        if (!res.ok) {
          setFollowingLoading(false);
          return;
        }
        const data = await res.json();
        const mapped: EntryWithUser[] = (data.entries || []).map((e: Record<string, unknown>) => ({
          ...e,
          user_has_liked: false,
        }));
        setFollowingEntries(mapped);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setFollowingEntries([]);
        }
      } finally {
        setFollowingLoading(false);
      }
    };

    fetchFollowing();
    return () => controller.abort();
  }, [feedFilter, isAuthenticated]);

  useEffect(() => {
    if (!activeChallenge) return;
    const fetchChallengeEntries = async () => {
      const { data, error } = await supabase
        .from('challenge_entries')
        .select('entry_id')
        .eq('challenge_id', activeChallenge.id);
      if (!error && data) {
        setChallengeEntryIds(new Set(data.map(d => d.entry_id)));
      }
    };
    fetchChallengeEntries();
  }, [activeChallenge, allEntries]);

  // Update visible entries when entries or visibleCount changes
  useEffect(() => {
    if (feedFilter === 'all') {
      setVisibleEntries(allEntries.slice(0, visibleCount));
    }
  }, [allEntries, visibleCount, feedFilter]);

  // Update visible entries for following filter
  useEffect(() => {
    if (feedFilter === 'following') {
      setVisibleEntries(followingEntries.slice(0, visibleCount));
    }
  }, [followingEntries, visibleCount, feedFilter]);

  // Load more entries
  const loadMore = () => {
    setVisibleCount(prevCount => prevCount + 10);
  };

  // Format date as dd/mm/yy (en-GB format)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).replace(/\//g, '/');
  };

  // Format time as hh:mm
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Delete post with AbortController
  const handleDeletePost = async (entryId: string) => {
    if (deleteLoading) return;
    
    setDeleteLoading(true);
    setError('');
    setDeleteSuccess(null);
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`/api/posts/delete?entryId=${entryId}`, {
        method: 'DELETE',
        signal: abortController.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el post');
      }
      
      // Clear confirmation state
      setDeleteConfirmation(null);
      setShowOptionsMenu(null);
      
      // Show success message
      setDeleteSuccess('Tu post ha sido eliminado.');
      
      // Note: The PostContext real-time subscription will automatically handle removing the deleted post
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('La operación tardó demasiado tiempo');
      } else {
        console.error('Error deleting post:', err);
        setError(err instanceof Error ? err.message : 'Error al eliminar el post');
      }
    } finally {
      setDeleteLoading(false);
    }
  };
  
  // Iniciar edición de un post
  const startEditingPost = (entry: EntryWithUser) => {
    setEditingPostId(entry.id);
    setEditingMessage(entry.mensaje);
    setShowOptionsMenu(null); // Cerrar el menú de opciones
  };
  
  // Cancelar la edición de un post
  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditingMessage('');
  };
  
  // Guardar los cambios de un post editado con AbortController
  const saveEditedPost = async (entryId: string) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
    
    try {
      // Validar que el mensaje no esté vacío
      if (!editingMessage.trim()) {
        setError('El mensaje no puede estar vacío');
        return;
      }
      
      // Validar longitud máxima
      if (editingMessage.length > 300) {
        setError('El mensaje no puede exceder los 300 caracteres');
        return;
      }
      
      // Enviar la petición para actualizar el post
      const response = await fetch(`/api/posts/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          mensaje: editingMessage,
        }),
        signal: abortController.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el post');
      }
      
      // Mostrar mensaje de éxito
      setDeleteSuccess('Post actualizado correctamente');
      
      // Limpiar estado de edición
      setEditingPostId(null);
      setEditingMessage('');
      
      // Note: The PostContext real-time subscription will automatically handle post updates
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('La operación tardó demasiado tiempo');
      } else {
        console.error('Error updating post:', err);
        setError(err instanceof Error ? err.message : 'Error al actualizar el post');
      }
    }
  };

  // Open social share modal
  const openSocialShare = (entry: EntryWithUser) => {
    setSocialShareModal({ isOpen: true, entry });
  };

  // Toggle post privacy
  const togglePostPrivacy = async (entry: EntryWithUser) => {
    if (privacyLoading === entry.id) return;
    
    setPrivacyLoading(entry.id);
    setError('');
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000);
    
    try {
      const newPrivacyState = !entry.is_private;
      
      const response = await fetch(`/api/posts/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: entry.id,
          is_private: newPrivacyState,
        }),
        signal: abortController.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar la privacidad del post');
      }
      
      // Show success message
      setDeleteSuccess(`Post marcado como ${newPrivacyState ? 'privado' : 'público'}`);
      
      // Close options menu
      setShowOptionsMenu(null);
      
      // Note: Privacy changes will be reflected through PostContext real-time subscription
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('La operación tardó demasiado tiempo');
      } else {
        console.error('Error toggling post privacy:', err);
        setError(err instanceof Error ? err.message : 'Error al cambiar la privacidad del post');
      }
    } finally {
      setPrivacyLoading(null);
    }
  };

  if (loading) {
    return (
      <div className={`w-full max-w-[600px] mx-auto px-4 py-8 text-center font-montserrat ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        <div className="animate-pulse flex justify-center">
          <div className="h-6 w-24 bg-neutral-400 rounded"></div>
        </div>
        <p className="mt-2 opacity-80 flex items-center justify-center gap-2">
          Cargando <WhisperLogo className="h-5 w-auto" isDay={isDay} />...
        </p>
        
        {showLoadingError && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
            <p className="flex items-center justify-center gap-2">
              Error al cargar <WhisperLogo className="h-4 w-auto" isDay={isDay} />, intenta de nuevo
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[600px] mx-auto px-4 py-8 font-montserrat ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
      <h2 className="text-xl mb-6 text-center flex items-center justify-center gap-1">
        <span className="font-bold"><WhisperLogo className="h-6 w-auto" isDay={isDay} /></span> de la comunidad
      </h2>

      <FeedFilter
        filter={feedFilter}
        onFilterChange={(f) => { setFeedFilter(f); setVisibleCount(10); }}
        isDay={isDay}
        isAuthenticated={isAuthenticated}
      />

      {/* Show error message if there's an error */}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {deleteSuccess && (
        <div role="status" className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          <p>{deleteSuccess}</p>
        </div>
      )}
      
      {followingLoading && feedFilter === 'following' ? (
        <div className={`w-full text-center py-8 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
          <p className="opacity-80">Cargando whispers de quienes sigues...</p>
        </div>
      ) : (feedFilter === 'all' ? allEntries.length : followingEntries.length) === 0 ? (
        <div className={`${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'} p-4 text-center rounded-lg shadow-md transition-all duration-300`}>
          <p className="flex items-center justify-center gap-2">
            {feedFilter === 'following'
              ? 'No hay whispers de quienes sigues. Sigue a alguien para ver sus publicaciones aqui.'
              : <>No hay <WhisperLogo className="h-4 w-auto" isDay={isDay} /> aun. ¡Se el primero en compartir!</>
            }
          </p>
        </div>
      ) : (
        <div className={`space-y-4 transition-all duration-300 ${dbStatus === 'connecting' ? 'opacity-50' : 'opacity-100'}`}>
          {visibleEntries
            .filter(entry => !entry.id.startsWith('temp-'))
            .map((entry) => (
            <div key={entry.id}>
              {entry.is_repost && entry.reposted_by && (
                <div className={`flex items-center gap-1.5 text-xs mb-1.5 ml-1 ${
                  isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'
                }`}>
                  <Repeat2 size={12} />
                  <span>
                    <Link
                      href={`/profile?user=${entry.reposted_by.user_id}`}
                      className="font-medium hover:underline"
                    >
                      {entry.reposted_by.display_name}
                    </Link>
                    {' reposteó'}
                  </span>
                </div>
              )}
            <article
              aria-label={`Whisper de ${entry.display_name}`}
              className={`relative overflow-hidden ${
                isDay
                  ? 'bg-[#F5F0E1] shadow-[0_4px_12px_rgba(74,46,27,0.1)]'
                  : 'bg-[#2D1E1A] shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
              } p-6 rounded-lg transition-all duration-300 hover:shadow-lg`}
            >
              {challengeEntryIds.has(entry.id) && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-600/40 via-yellow-400/70 to-amber-600/40" />
                  <div className={`absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                    isDay
                      ? 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20'
                      : 'bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20'
                  }`}>
                    <span className="text-xs">🏆</span>
                    Reto
                  </div>
                </>
              )}
              <div className="flex items-center justify-between mb-4 border-b pb-3 border-opacity-10 border-current">
                {entry.guest ? (
                  <div className="flex items-center gap-2">
                    <Avatar src={null} name={entry.display_name} size="sm" />
                    <span className="font-medium text-base">
                      {entry.display_id}
                    </span>
                  </div>
                ) : (
                  <Link href={`/profile?user=${entry.user_id}`} className="hover:opacity-80 transition-opacity flex items-center gap-2">
                    <Avatar src={entry.profile_photo_url} name={entry.display_name} size="sm" />
                    <span className="font-medium text-base">
                      {entry.display_name} <span className="font-normal opacity-70">{entry.display_id}</span>
                    </span>
                  </Link>
                )}
                <div className="flex items-center gap-3 text-sm opacity-70">
                  <span className="text-sm">
                    {formatTime(entry.fecha)} {formatDate(entry.fecha)}
                  </span>
                  {entry.franja === 'DIA' ? <SunIcon /> : <MoonIcon />}
                  {entry.mood && isMood(entry.mood) && (
                    <span className="text-sm" title={entry.mood}>{getMoodEmoji(entry.mood)}</span>
                  )}
                  {entry.is_private && <LockIcon />}
                </div>
              </div>
              
              {/* Si el post está siendo editado, mostrar formulario de edición */}
              {editingPostId === entry.id ? (
                <div className="mb-4">
                  <textarea
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    className={`w-full p-3 rounded-lg border-2 focus:outline-none focus:ring-2 resize-none transition-all duration-300 ${
                      isDay 
                        ? 'bg-white border-[#4A2E1B] focus:ring-[#4A2E1B]/30' 
                        : 'bg-[#3A2723] border-[#F5F0E1] focus:ring-[#F5F0E1]/30'
                    }`}
                    rows={3}
                    maxLength={300}
                  />
                  <div className="flex justify-between mt-2">
                    <div className="text-sm opacity-70">
                      {editingMessage.length}/300
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEditingPost}
                        className={`px-3 py-1 rounded-md text-sm ${
                          isDay 
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEditedPost(entry.id)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          isDay 
                            ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:opacity-90' 
                            : 'bg-[#F5F0E1] text-[#2D1E1A] hover:opacity-90'
                        }`}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-sm leading-relaxed font-montserrat break-words whitespace-pre-wrap overflow-hidden">
                    {entry.mensaje}
                  </p>
                  {/* Mostrar indicador de editado si el post ha sido modificado */}
                  {entry.edited && (
                    <span className="text-xs opacity-60 italic mt-1 block">(Editado)</span>
                  )}
                </div>
              )}
              
              {/* Mostrar objetivos solo si la franja es DIA */}
              {entry.franja === 'DIA' && (
                <ObjectivesList
                  entryId={entry.id}
                  authorId={entry.user_id}
                  isDay={isDay}
                  isEditing={editingPostId === entry.id}
                />
              )}

              {entry.franja === 'NOCHE' && (
                <EntryHabitsDisplay entryId={entry.id} isDay={isDay} />
              )}

              {/* Action buttons (Like, Share, and Delete if own post) */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* Like button using our new component */}
                  <LikeButton
                    entryId={entry.id}
                    initialLikeCount={entry.likes_count}
                    initialLiked={entry.user_has_liked}
                    isDay={isDay}
                  />
                  <RepostButton
                    entryId={entry.id}
                    initialRepostCount={entry.reposts_count}
                    initialReposted={entry.user_has_reposted}
                    isDay={isDay}
                  />

                  {/* Menu de opciones - solo mostrar para posts propios */}
                  {isAuthenticated && currentUserId === entry.user_id && !entry.guest && (
                    <div className="relative">
                      <button
                        onClick={() => setShowOptionsMenu(showOptionsMenu === entry.id ? null : entry.id)}
                        className={`p-2 rounded-full transition-colors ${
                          isDay 
                            ? 'hover:bg-[#4A2E1B]/10' 
                            : 'hover:bg-[#F5F0E1]/10'
                        }`}
                        aria-label="Opciones"
                        title="Opciones"
                      >
                        <MenuDotsIcon />
                      </button>
                      
                      {/* Menú desplegable de opciones */}
                      {showOptionsMenu === entry.id && (
                        <div role="menu" aria-label="Opciones del whisper" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-lg shadow-lg z-10 w-48 overflow-hidden">
                          <div className={`${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'}`}>
                            <button
                              role="menuitem"
                              onClick={() => startEditingPost(entry)}
                              className={`flex items-center gap-2 w-full px-4 py-3 text-left text-sm ${
                                isDay
                                  ? 'text-[#4A2E1B] hover:bg-[#4A2E1B]/10'
                                  : 'text-[#F5F0E1] hover:bg-[#F5F0E1]/10'
                              } transition-colors`}
                            >
                              <EditIcon /> Editar
                            </button>

                            <button
                              role="menuitem"
                              onClick={() => togglePostPrivacy(entry)}
                              disabled={privacyLoading === entry.id}
                              className={`flex items-center gap-2 w-full px-4 py-3 text-left text-sm ${
                                privacyLoading === entry.id
                                  ? 'opacity-50 cursor-not-allowed'
                                  : isDay
                                    ? 'text-[#4A2E1B] hover:bg-[#4A2E1B]/10'
                                    : 'text-[#F5F0E1] hover:bg-[#F5F0E1]/10'
                              } transition-colors`}
                            >
                              {entry.is_private ? <GlobeIcon /> : <LockIcon />}
                              {privacyLoading === entry.id
                                ? 'Cambiando...'
                                : entry.is_private
                                  ? 'Hacer publico'
                                  : 'Hacer privado'
                              }
                            </button>

                            <button
                              role="menuitem"
                              onClick={() => setDeleteConfirmation(entry.id)}
                              className={`flex items-center gap-2 w-full px-4 py-3 text-left text-sm text-red-500 ${
                                isDay
                                  ? 'hover:bg-[#4A2E1B]/10'
                                  : 'hover:bg-[#F5F0E1]/10'
                              } transition-colors`}
                            >
                              <DeleteIcon /> Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Confirmación de eliminación */}
                      {deleteConfirmation === entry.id && (
                        <>
                          <div className="modal-overlay" aria-hidden="true" onClick={() => setDeleteConfirmation(null)} />
                          <div
                            role="alertdialog"
                            aria-modal="true"
                            aria-label="Confirmar eliminacion"
                            className={`fixed sm:absolute bottom-auto sm:bottom-full left-1/2 -translate-x-1/2 top-1/2 sm:top-auto -translate-y-1/2 sm:translate-y-0 sm:mb-2 p-4 rounded-lg shadow-lg z-50 w-[90vw] max-w-xs sm:w-64 ${
                              isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
                            }`}
                          >
                            <p className={`text-xs mb-3 ${
                              isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
                            }`}>
                              ¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => setDeleteConfirmation(null)}
                                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                                  isDay 
                                    ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20' 
                                    : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20'
                                }`}
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleDeletePost(entry.id)}
                                disabled={deleteLoading}
                                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                                  deleteLoading 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : isDay
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-red-500 text-white hover:bg-red-600'
                                }`}
                              >
                                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Share button */}
                <button
                  onClick={() => openSocialShare(entry)}
                  className={`px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 mt-4 ${
                    isDay 
                      ? 'bg-[#4A2E1B] text-[#F5F0E1]' 
                      : 'bg-[#F5F0E1] text-[#2D1E1A]'
                  } hover:opacity-90`}
                  aria-label="Compartir este whisper"
                >
                  <span className="text-xs font-medium">Compartir</span>
                  <ShareArrowIcon />
                </button>
              </div>
            </article>
            </div>
          ))}

          {visibleEntries.length < (feedFilter === 'all' ? allEntries.length : followingEntries.length) && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                className={`px-6 py-2 rounded-lg transition-all duration-300 font-montserrat ${
                  isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                } hover:opacity-90`}
                aria-label="Cargar más whispers"
              >
                Ver más
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Social Share Modal */}
      {socialShareModal.isOpen && socialShareModal.entry && (
        <SocialShareModal
          isOpen={socialShareModal.isOpen}
          onClose={() => setSocialShareModal({ isOpen: false, entry: null })}
          entry={socialShareModal.entry}
          isDay={isDay}
        />
      )}
    </div>
  );
} 