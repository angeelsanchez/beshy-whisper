'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { SearchParamsWrapper } from '@/components/SearchParamsWrapper';
import { supabase } from '@/lib/supabase';
import { formatLikeCount } from '@/utils/format-utils';
import dynamic from 'next/dynamic';
import LikeButton from '@/components/LikeButton';
import ObjectivesList from '@/components/ObjectivesList';
import ActivityCalendar from '@/components/ActivityCalendar';
import PullToRefresh from '@/components/PullToRefresh';

// Dynamically import NameUpdateForm to avoid hydration issues
const NameUpdateForm = dynamic(() => import('@/components/NameUpdateForm'), {
  ssr: false,
});

// Importar el componente DownloadPDFModal
const DownloadPDFModal = dynamic(() => import('@/components/DownloadPDFModal'), {
  ssr: false,
});

// Custom hook for time of day
const useTimeOfDay = () => {
  const [isDay, setIsDay] = useState(true);
  
  useEffect(() => {
    const checkTimeOfDay = () => {
      const now = new Date();
      const hour = now.getHours();
      setIsDay(hour >= 6 && hour < 18); // Day is 6:00 to 17:59
    };
    
    checkTimeOfDay();
    const interval = setInterval(checkTimeOfDay, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return isDay;
};

// SVG icons
const SunIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
  </svg>
);

const MoonIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
  </svg>
);

// Heart icon for likes
const HeartIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
  </svg>
);

// Post icon for publications count
const PostIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
    <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
  </svg>
);

// Edit icon for profile editing
const EditIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
  </svg>
);

// Logout icon for signing out
const LogoutIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
    <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
  </svg>
);

// Delete icon for trash button
const DeleteIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
  </svg>
);

// Objetivo icon para el contador de objetivos completados
const ObjectiveIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
    <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z"/>
  </svg>
);

// Lock icon for private posts
const LockIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
  </svg>
);

// Three dots menu icon
const MenuDotsIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
  </svg>
);

// Globe icon for public posts
const GlobeIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm.312-3.5h2.49c-.062-.89-.291-1.733-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
  </svg>
);

interface UserEntry {
  id: string;
  mensaje: string;
  fecha: string;
  franja: 'DIA' | 'NOCHE';
  likes_count: number; // Count of likes for this entry
  objectives?: Array<{
    id: string;
    text: string;
    done: boolean;
  }>;
  is_private: boolean; // Added for private posts
}

interface UserProfile {
  id: string;
  alias: string;
  bsy_id: string;
  name: string;
  total_likes: number; // Total likes across all entries
  completed_objectives: number; // Total completed objectives
}

export default function Profile() {
  const { session, status, isAuthenticated } = useAuthSession();
  const [entries, setEntries] = useState<UserEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditFormExpanded, setIsEditFormExpanded] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  // Añadir estado para el modal de descarga de PDF
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  // Estado para la confirmación de logout
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  // Estado para la edición de posts
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState<string | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(session?.user?.id || null);
  
  useEffect(() => {
    if (session?.user?.id && !userId) {
      setUserId(session.user.id);
    }
  }, [session?.user?.id, userId]);
  
  // Use custom hook for time of day
  const isDay = useTimeOfDay();

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    // Force a re-render by updating the refresh key
    setRefreshKey(prev => prev + 1);
    
    // Reset error state
    setError('');
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear any caches if needed
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      } catch (error) {
        console.log('Cache clearing failed:', error);
      }
    }
  };

  // Handle name updates
  const handleNameUpdated = (newName: string) => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        name: newName
      });
    }
  };

  // Toggle edit form visibility
  const toggleEditForm = () => {
    setIsEditFormExpanded(!isEditFormExpanded);
  };

  // Delete post
  const handleDeletePost = async (entryId: string) => {
    if (deleteLoading) return;
    
    setDeleteLoading(true);
    setError('');
    setDeleteSuccess(null);
    
    try {
      const response = await fetch(`/api/posts/delete?entryId=${entryId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el post');
      }
      
      // Clear confirmation state
      setDeleteConfirmation(null);
      
      // Show success message
      setDeleteSuccess('Tu post ha sido eliminado.');
      
      // Get the deleted entry's likes count before removing it from state
      const deletedEntryLikes = entries.find(entry => entry.id === entryId)?.likes_count || 0;
      
      // Update local state to remove the deleted entry using functional update
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
      
      // Update total likes count
      if (userProfile) {
        setUserProfile(prevProfile => {
          if (!prevProfile) return prevProfile;
          return {
            ...prevProfile,
            total_likes: Math.max(0, prevProfile.total_likes - deletedEntryLikes)
          };
        });
      }
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting post:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar el post');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Iniciar edición de un post
  const startEditingPost = (entry: UserEntry) => {
    setEditingPostId(entry.id);
    setEditingMessage(entry.mensaje);
    setShowOptionsMenu(null); // Cerrar el menú de opciones
  };
  
  // Cancelar la edición de un post
  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditingMessage('');
  };
  
  // Guardar los cambios de un post editado
  const saveEditedPost = async (entryId: string) => {
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
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el post');
      }
      
      // Mostrar mensaje de éxito
      setDeleteSuccess('Post actualizado correctamente');
      
      // Limpiar estado de edición
      setEditingPostId(null);
      setEditingMessage('');
      
      // Actualizar la entrada en el estado local usando functional update
      setEntries(prevEntries => prevEntries.map(entry => 
        entry.id === entryId 
          ? { ...entry, mensaje: editingMessage }
          : entry
      ));
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating post:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el post');
    }
  };

  // Toggle post privacy
  const togglePostPrivacy = async (entry: UserEntry) => {
    if (privacyLoading === entry.id) return;
    
    setPrivacyLoading(entry.id);
    setError('');
    
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
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar la privacidad del post');
      }
      
      // Show success message
      setDeleteSuccess(`Post marcado como ${newPrivacyState ? 'privado' : 'público'}`);
      
      // Close options menu
      setShowOptionsMenu(null);
      
      // Update the entry in local state using functional update
      setEntries(prevEntries => prevEntries.map(e => 
        e.id === entry.id 
          ? { ...e, is_private: newPrivacyState }
          : e
      ));
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error toggling post privacy:', err);
      setError(err instanceof Error ? err.message : 'Error al cambiar la privacidad del post');
    } finally {
      setPrivacyLoading(null);
    }
  };

  useEffect(() => {
    // Redirect if not authenticated or still loading
    if (status === 'loading') return;
    
    // Redirect to home page if user is not authenticated and there's no user param
    if (!isAuthenticated && !userId) {
      router.push('/');
      return;
    }
    
    // Main function to load all user data
    const loadUserData = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Get user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, alias, bsy_id, name')
          .eq('id', userId)
          .single();
        
        if (userError) {
          console.error('Error fetching user profile:', userError);
          setError('Error al cargar el perfil del usuario.');
          setLoading(false);
          return;
        }
        
        if (!userData) {
          console.error('No user data found for ID:', userId);
          setError('Usuario no encontrado.');
          setLoading(false);
          return;
        }
        
        // Get entries from the specified user that are not guest posts
        let query = supabase
          .from('entries')
          .select('id, mensaje, fecha, franja, is_private')
          .eq('user_id', userId)
          .eq('guest', false);

        // Si el usuario que está viendo el perfil es diferente al dueño, excluir posts privados
        if (session?.user?.id !== userId) {
          query = query.eq('is_private', false);
        }

        // Ordenar por fecha descendente
        const { data: entriesData, error: entriesError } = await query.order('fecha', { ascending: false });

        if (entriesError) {
          console.error('Error fetching user entries:', entriesError);
          setError('Error al cargar los susurros. Por favor, intenta de nuevo más tarde.');
          setLoading(false);
          return;
        }
        
        // Obtener el recuento de objetivos completados
        const { data: completedObjectives, error: objectivesError } = await supabase
          .from('objectives')
          .select('id')
          .eq('user_id', userId)
          .eq('done', true);
          
        if (objectivesError) {
          console.error('Error fetching completed objectives:', objectivesError);
          // No interrumpimos el flujo si falla la consulta de objetivos
        }
        
        const completedObjectivesCount = completedObjectives?.length || 0;
        
        // Initialize entries with zero likes
        const entriesWithLikes = (entriesData || []).map(entry => ({
          ...entry,
          likes_count: 0
        }));
        
        // Get all entry IDs for likes counting
        const entryIds = entriesWithLikes.map(entry => entry.id);
        
        // Fetch likes data for these entries
        let totalLikes = 0;
        const likesCountMap = new Map<string, number>();
        
        if (entryIds.length > 0) {
          // Get all likes for these entries
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('id, entry_id')
            .in('entry_id', entryIds);
          
          if (likesError) {
            console.error('Error fetching likes data:', likesError);
          } else if (likesData && likesData.length > 0) {
            console.log('Fetched likes data:', likesData);
            
            // Count total likes and likes per entry
            totalLikes = likesData.length;
            
            // Count likes per entry
            likesData.forEach(like => {
              if (like && like.entry_id) {
                const entryId = like.entry_id;
                const currentCount = likesCountMap.get(entryId) || 0;
                likesCountMap.set(entryId, currentCount + 1);
              }
            });
            
            console.log('Likes count map:', Object.fromEntries(likesCountMap));
          }
        }
        
        // Update entries with likes count
        const entriesWithLikesAndCounts = entriesWithLikes.map(entry => ({
          ...entry,
          likes_count: likesCountMap.get(entry.id) || 0
        }));
        
        // Para las entradas de día, cargar los objetivos
        const entriesWithObjectives = [...entriesWithLikesAndCounts];
        
        // Cargar objetivos solo para entradas de día
        const dayEntries = entriesWithLikesAndCounts.filter(entry => entry.franja === 'DIA');
        
        if (dayEntries.length > 0) {
          // Obtener los IDs de las entradas de día
          const dayEntryIds = dayEntries.map(entry => entry.id);
          
          // Cargar todos los objetivos para estas entradas
          const { data: objectivesData, error: objectivesError } = await supabase
            .from('objectives')
            .select('*')
            .in('entry_id', dayEntryIds);
          
          if (objectivesError) {
            console.error('Error al cargar objetivos:', objectivesError);
          } else if (objectivesData) {
            // Agrupar objetivos por entry_id
            const objectivesByEntry = objectivesData.reduce((acc, obj) => {
              if (!acc[obj.entry_id]) {
                acc[obj.entry_id] = [];
              }
              acc[obj.entry_id].push({
                id: obj.id,
                text: obj.text,
                done: obj.done
              });
              return acc;
            }, {} as Record<string, Array<{ id: string; text: string; done: boolean; }>>);
            
            // Asignar objetivos a cada entrada
            entriesWithObjectives.forEach((entry, index) => {
              if (entry.franja === 'DIA' && objectivesByEntry[entry.id]) {
                entriesWithObjectives[index] = {
                  ...entry,
                  objectives: objectivesByEntry[entry.id]
                } as UserEntry;
              }
            });
          }
        }
        
        // Set user profile with total likes
        setUserProfile({
          ...userData,
          total_likes: totalLikes,
          completed_objectives: completedObjectivesCount
        });
        
        // Set entries with likes count
        setEntries(entriesWithObjectives);
      } catch (err) {
        console.error('Unexpected error loading user data:', err);
        setError('Error inesperado. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [session, status, isAuthenticated, router, userId, refreshKey]);

  // Format date as dd/mm/yy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
  };

  // Format time as hh:mm
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Determine if viewing own profile or someone else's
  const isOwnProfile = session?.user?.id === userId;

  if (loading) {
    return (
      <div className={`w-full max-w-[600px] mx-auto px-4 py-8 text-center font-montserrat ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
           style={{ backgroundColor: isDay ? '#F5F0E1' : '#2D1E1A' }}>
        <div className="animate-pulse flex justify-center">
          <div className={`h-6 w-24 ${isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'} rounded-md`}></div>
        </div>
        <p className="mt-2 opacity-80">Cargando susurros...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full max-w-[600px] mx-auto px-4 py-8 font-montserrat ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
           style={{ backgroundColor: isDay ? '#F5F0E1' : '#2D1E1A' }}>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <p className="font-bold mb-1">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen" style={{ backgroundColor: isDay ? '#F5F0E1' : '#2D1E1A' }}>
      <Suspense fallback={null}>
        <SearchParamsWrapper onUserIdChange={setUserId} defaultUserId={session?.user?.id} />
      </Suspense>
      <PullToRefresh onRefresh={handleRefresh} isDay={isDay}>
        <div className={`w-full max-w-[600px] mx-auto px-4 py-8 font-montserrat ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
      {/* Header */}
      <header className="flex flex-col items-center mb-8">
        <div className="mb-2 flex flex-col items-center justify-center gap-3">
          {/* Speech bubble with user profile */}
          <div className="relative">
            <div className={`rounded-full border-4 border-white p-4 transition-all duration-300 ${
              isDay 
                ? 'bg-[#F5F0E1] shadow-[0_4px_12px_rgba(74,46,27,0.15)]' 
                : 'bg-[#2D1E1A] shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16" className="h-16 w-16">
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
              </svg>
            </div>
            {/* Three oval bubbles */}
            <div className={`absolute top-full left-[5%] -translate-x-1/2 -mt-3.5 w-3 h-2 rounded-full border-2 border-white transition-all duration-300 ${
              isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
            }`}></div>
            <div className={`absolute top-full left-[-10%] -translate-x-1/2 -mt-2 w-2.5 h-1.5 rounded-full border-2 border-white transition-all duration-300 ${
              isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
            }`}></div>
            <div className={`absolute top-full left-[-20%] -translate-x-1/2 -mt-0.5 w-2 h-1 rounded-full border-2 border-white transition-all duration-300 ${
              isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
            }`}></div>
          </div>
          
          {/* Profile title */}
          <div>
            <h1 className="text-3xl font-bold text-center">
              Perfil
              {!isOwnProfile && <span className="text-lg font-normal ml-2 opacity-70">(Visitando)</span>}
            </h1>
          </div>
        </div>
        <p className="text-lg mb-6">
          {isOwnProfile ? 'Gestiona tu perfil y susurros' : 'Explora los susurros de este usuario'}
        </p>
        
        {/* User name and ID */}
        {userProfile && (
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xl font-bold">
                {userProfile?.name || (isOwnProfile ? session?.user?.name : 'Usuario')}
              </span>
              <span className="text-sm font-medium opacity-70">
                {userProfile.bsy_id || userProfile.alias}
              </span>
            </div>
          </div>
        )}
        
        {/* Navigation back */}
        <div className="flex items-center justify-between w-full mb-4">
          <Link href="/feed" className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
            isDay 
              ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] shadow-[0_2px_8px_rgba(74,46,27,0.2)]' 
              : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
          } hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0">
              <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
            <span className="font-medium">Volver al Feed</span>
          </Link>
          <div className="w-10"></div>
        </div>
      </header>
      
      {/* Show success message after deletion */}
      {deleteSuccess && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          <p>{deleteSuccess}</p>
        </div>
      )}
      
      {/* Profile actions section */}
      {userProfile && (
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center">
            
            {/* Edit profile button and Download button - only visible on own profile */}
            {isOwnProfile && (
              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={toggleEditForm}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    isEditFormExpanded 
                      ? isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]' 
                      : isDay 
                        ? 'bg-[#4A2E1B]/10 hover:bg-[#4A2E1B]/20 text-[#4A2E1B]' 
                        : 'bg-[#F5F0E1]/10 hover:bg-[#F5F0E1]/20 text-[#F5F0E1]'
                  }`}
                  aria-label="Editar perfil"
                >
                  <EditIcon isDay={isDay} />
                  <span>{isEditFormExpanded ? 'Cerrar' : 'Editar Perfil'}</span>
                </button>
                
                {/* Botón de cerrar sesión */}
                <div className="relative">
                  {showLogoutConfirmation ? (
                    <>
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40" 
                        onClick={() => setShowLogoutConfirmation(false)}
                      ></div>
                      <div className="fixed sm:absolute bottom-auto sm:bottom-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 top-1/2 sm:top-auto -translate-y-1/2 sm:translate-y-0 sm:mb-2 p-4 rounded-lg shadow-lg z-50 w-[90vw] max-w-sm sm:w-80 bg-white">
                        <p className="text-sm text-gray-800 mb-3 font-medium">
                          ¿Estás seguro de que quieres cerrar sesión?
                        </p>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setShowLogoutConfirmation(false)}
                            className="px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                          >
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <button 
                      onClick={() => setShowLogoutConfirmation(true)}
                      className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                        isDay 
                          ? 'bg-[#4A2E1B]/10 hover:bg-[#4A2E1B]/20 text-[#4A2E1B]' 
                          : 'bg-[#F5F0E1]/10 hover:bg-[#F5F0E1]/20 text-[#F5F0E1]'
                      }`}
                      aria-label="Cerrar sesión"
                    >
                      <LogoutIcon isDay={isDay} />
                      <span>Cerrar sesión</span>
                    </button>
                  )}
                </div>

                {/* Nuevo botón para descargar PDF */}
                {entries.length > 0 && (
                  <button 
                    onClick={() => setIsPDFModalOpen(true)}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                      isDay 
                        ? 'bg-[#4A2E1B]/10 hover:bg-[#4A2E1B]/20 text-[#4A2E1B]' 
                        : 'bg-[#F5F0E1]/10 hover:bg-[#F5F0E1]/20 text-[#F5F0E1]'
                    }`}
                    aria-label="Descargar mis pensamientos en PDF"
                  >
                    <DownloadIcon isDay={isDay} />
                    <span>Descargar mis pensamientos</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modal para descargar PDF */}
      {isOwnProfile && (
        <DownloadPDFModal 
          isOpen={isPDFModalOpen}
          onClose={() => setIsPDFModalOpen(false)}
          entries={entries}
          userName={userProfile?.name || (session?.user?.name as string) || 'Usuario'}
          userId={userProfile?.bsy_id || userProfile?.alias || ''}
          isDay={isDay}
        />
      )}
      
      {/* Name update form for own profile - only visible when expanded */}
      {isOwnProfile && (
        <div className="mb-6">
          <NameUpdateForm 
            onNameUpdated={handleNameUpdated} 
            className={`bg-white/10 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
            isExpanded={isEditFormExpanded}
            onToggleExpand={toggleEditForm}
          />
        </div>
      )}
      
      {/* Total likes count and publications count */}
      {userProfile && (
        <div className={`flex justify-around mb-8 p-4 rounded-lg shadow-md ${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'}`}>
          <div className="flex flex-col items-center">
            <div className="mb-1">
              <HeartIcon isDay={isDay} />
            </div>
            <span className="font-bold text-lg">
              {formatLikeCount(userProfile.total_likes)}
            </span>
            <span className="text-xs opacity-70">Likes</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-1">
              <PostIcon isDay={isDay} />
            </div>
            <span className="font-bold text-lg">
              {entries.length}
            </span>
            <span className="text-xs opacity-70">Whispers</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-1">
              <ObjectiveIcon isDay={isDay} />
            </div>
            <span className="font-bold text-lg">
              {userProfile.completed_objectives}
            </span>
            <span className="text-xs opacity-70">Objetivos</span>
          </div>
        </div>
      )}
      
      {/* Activity Calendar - only for own profile */}
      {isOwnProfile && userProfile && (
        <div className="mb-8">
          <ActivityCalendar userId={userId} isDay={isDay} />
        </div>
      )}
      
      {entries.length === 0 ? (
        <div className={`bg-white/10 p-6 text-center rounded-lg shadow-md transition-all duration-300`}>
          <p className="font-montserrat">
            {isOwnProfile ? 'No has publicado susurros aún.' : 'Este usuario no ha publicado susurros aún.'}
          </p>
          <p className="text-sm mt-2 opacity-75">
            {isOwnProfile ? 'Tus susurros aparecerán aquí cuando los publiques.' : 'Los susurros aparecerán aquí cuando se publiquen.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div 
              key={entry.id}
              className={`bg-white/10 p-4 rounded-lg shadow-md transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3 border-b pb-2 border-opacity-20 border-current">
                <span className="font-bold text-sm">
                  {userProfile?.name || (isOwnProfile ? session?.user?.name : 'Usuario')}
                  <span className="font-normal opacity-70 ml-1">
                    {userProfile?.bsy_id || userProfile?.alias || ''}
                  </span>
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span>
                    {formatTime(entry.fecha)} {formatDate(entry.fecha)}
                  </span>
                  {entry.franja === 'DIA' ? <SunIcon isDay={isDay} /> : <MoonIcon isDay={isDay} />}
                  {entry.is_private && <LockIcon isDay={isDay} />}
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
                <p className="mb-2 text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden">{entry.mensaje}</p>
              )}
              
              {/* Mostrar objetivos solo si la franja es DIA */}
              {entry.franja === 'DIA' && (
                <ObjectivesList 
                  entryId={entry.id} 
                  authorId={userId || null}
                  isDay={isDay}
                />
              )}
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* Like count using the LikeButton component */}
                  <LikeButton 
                    entryId={entry.id}
                    initialLikeCount={entry.likes_count}
                    isDay={isDay}
                  />
                  
                  {/* Menu de opciones - solo mostrar para posts propios */}
                  {isOwnProfile && (
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
                        <MenuDotsIcon isDay={isDay} />
                      </button>
                      
                      {/* Menú desplegable de opciones */}
                      {showOptionsMenu === entry.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-lg shadow-lg z-10 w-48 overflow-hidden">
                          <div className={`${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'}`}>
                            {/* Opción de editar */}
                            <button
                              onClick={() => startEditingPost(entry)}
                              className={`flex items-center gap-2 w-full px-4 py-3 text-left text-sm ${
                                isDay 
                                  ? 'text-[#4A2E1B] hover:bg-[#4A2E1B]/10' 
                                  : 'text-[#F5F0E1] hover:bg-[#F5F0E1]/10'
                              } transition-colors`}
                            >
                              <EditIcon isDay={isDay} /> Editar
                            </button>
                            
                            {/* Opción de privacidad */}
                            <button
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
                              {entry.is_private ? <GlobeIcon isDay={isDay} /> : <LockIcon isDay={isDay} />}
                              {privacyLoading === entry.id 
                                ? 'Cambiando...' 
                                : entry.is_private 
                                  ? 'Hacer público' 
                                  : 'Hacer privado'
                              }
                            </button>
                            
                            {/* Opción de eliminar */}
                            <button
                              onClick={() => setDeleteConfirmation(entry.id)}
                              className={`flex items-center gap-2 w-full px-4 py-3 text-left text-sm text-red-500 ${
                                isDay 
                                  ? 'hover:bg-[#4A2E1B]/10' 
                                  : 'hover:bg-[#F5F0E1]/10'
                              } transition-colors`}
                            >
                              <DeleteIcon isDay={isDay} /> Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Confirmación de eliminación */}
                      {deleteConfirmation === entry.id && (
                        <>
                          <div className="modal-overlay" onClick={() => setDeleteConfirmation(null)}></div>
                          <div className="fixed sm:absolute bottom-auto sm:bottom-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 top-1/2 sm:top-auto -translate-y-1/2 sm:translate-y-0 sm:mb-2 p-3 rounded-lg shadow-lg z-50 w-[90vw] max-w-xs sm:w-64 bg-white">
                            <p className="text-xs text-gray-800 mb-2">
                              ¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-between gap-2">
                              <button
                                onClick={() => handleDeletePost(entry.id)}
                                disabled={deleteLoading}
                                className={`px-2 py-1 bg-red-600 text-white text-xs rounded-md ${deleteLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                              >
                                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-2 py-1 bg-gray-300 text-gray-800 text-xs rounded-md hover:bg-gray-400"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </PullToRefresh>
    </div>
  );
} 

// Nuevo icono para el botón de descarga
const DownloadIcon = ({ isDay }: { isDay: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={isDay ? "#4A2E1B" : "#F5F0E1"} viewBox="0 0 16 16">
    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
  </svg>
); 