import { useState, useEffect } from 'react';
import { formatLikeCount } from '@/utils/format-utils';
import { useAuthSession } from '@/hooks/useAuthSession';

interface LikeButtonProps {
  entryId: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
  isDay?: boolean;
  className?: string;
}

export default function LikeButton({
  entryId,
  initialLikeCount = 0,
  initialLiked = false,
  isDay = true,
  className = ''
}: LikeButtonProps) {
  const { isAuthenticated } = useAuthSession();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch initial like status - solo una vez al montar el componente
  useEffect(() => {
    if (!isAuthenticated || !entryId || hasInitialized) return;

    const fetchLikeStatus = async () => {
      try {
        const response = await fetch(`/api/likes/status?entryId=${entryId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch like status');
        }
        
        const data = await response.json();
        setIsLiked(data.liked);
        setLikeCount(data.count);
        setHasInitialized(true);
      } catch (err) {
        console.error('Error fetching like status:', err);
        // Don't show error to user, just use initial values
        setHasInitialized(true);
      }
    };

    fetchLikeStatus();
  }, [entryId, isAuthenticated, hasInitialized]);

  // Actualizar cuando cambian los props
  useEffect(() => {
    if (hasInitialized) return;
    
    setIsLiked(initialLiked);
    setLikeCount(initialLikeCount);
  }, [initialLiked, initialLikeCount, hasInitialized]);

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      setError('Debes iniciar sesión para dar me gusta');
      return;
    }

    if (!entryId) {
      setError('ID de entrada inválido');
      return;
    }
    
    // Si el ID comienza con 'temp-', es un post temporal y no se puede dar like aún
    if (entryId.startsWith('temp-')) {
      setError('Este post aún se está guardando, espera un momento');
      
      // Limpiar el error después de 3 segundos
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle like');
      }

      const data = await response.json();
      
      // Update state based on response
      setIsLiked(data.liked);
      
      // Optimistically update the like count
      setLikeCount(prevCount => data.liked ? prevCount + 1 : Math.max(0, prevCount - 1));
    } catch (err) {
      console.error('Error toggling like:', err);
      setError('Error al procesar tu me gusta');
      
      // Limpiar el error después de 3 segundos
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <button
        onClick={handleToggleLike}
        disabled={isLoading || !isAuthenticated}
        className={`flex items-center gap-1 transition-all duration-200 ${
          isAuthenticated ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
        }`}
        aria-label={isLiked ? "Quitar me gusta" : "Dar me gusta"}
        title={isAuthenticated ? (isLiked ? "Quitar me gusta" : "Dar me gusta") : "Inicia sesión para dar me gusta"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          fill={isLiked ? "#e53935" : (isDay ? "#7D6E5D" : "#B8B0A5")} 
          viewBox="0 0 16 16"
          className={`transition-transform duration-200 ${isLiked ? 'scale-110' : 'scale-100'}`}
        >
          <path fillRule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
        </svg>
        <span className="text-xs">
          {formatLikeCount(likeCount)}
        </span>
      </button>
      
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
} 