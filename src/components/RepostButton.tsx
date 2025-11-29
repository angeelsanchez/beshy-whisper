import { useState, useEffect } from 'react';
import { Repeat2 } from 'lucide-react';
import { formatLikeCount } from '@/utils/format-utils';
import { useAuthSession } from '@/hooks/useAuthSession';

interface RepostButtonProps {
  readonly entryId: string;
  readonly initialRepostCount?: number;
  readonly initialReposted?: boolean;
  readonly isDay?: boolean;
  readonly className?: string;
}

export default function RepostButton({
  entryId,
  initialRepostCount = 0,
  initialReposted = false,
  isDay = true,
  className = '',
}: RepostButtonProps) {
  const { isAuthenticated } = useAuthSession();
  const [isReposted, setIsReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !entryId || hasInitialized) return;

    const fetchRepostStatus = async () => {
      try {
        const response = await fetch(`/api/reposts/status?entryId=${entryId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch repost status');
        }

        const data = await response.json();
        setIsReposted(data.reposted);
        setRepostCount(data.count);
        setHasInitialized(true);
      } catch {
        setHasInitialized(true);
      }
    };

    fetchRepostStatus();
  }, [entryId, isAuthenticated, hasInitialized]);

  useEffect(() => {
    if (hasInitialized) return;

    setIsReposted(initialReposted);
    setRepostCount(initialRepostCount);
  }, [initialReposted, initialRepostCount, hasInitialized]);

  const handleToggleRepost = async () => {
    if (!isAuthenticated) {
      setError('Inicia sesión para repostear');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!entryId) {
      setError('ID de entrada inválido');
      return;
    }

    if (entryId.startsWith('temp-')) {
      setError('Este post aún se está guardando, espera un momento');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reposts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle repost');
      }

      const data = await response.json();
      setIsReposted(data.reposted);
      setRepostCount(prevCount => data.reposted ? prevCount + 1 : Math.max(0, prevCount - 1));
    } catch {
      setError('Error al procesar el repost');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const ACTIVE_COLOR = '#16a34a';
  const INACTIVE_COLOR = isDay ? '#7D6E5D' : '#B8B0A5';

  return (
    <div className={`flex flex-col ${className}`}>
      <button
        onClick={handleToggleRepost}
        disabled={isLoading || !isAuthenticated}
        className={`flex items-center gap-1 transition-all duration-200 ${
          isAuthenticated ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
        }`}
        aria-label={isReposted ? 'Quitar repost' : 'Repostear'}
        title={isAuthenticated ? (isReposted ? 'Quitar repost' : 'Repostear') : 'Inicia sesión para repostear'}
      >
        <Repeat2
          size={16}
          color={isReposted ? ACTIVE_COLOR : INACTIVE_COLOR}
          strokeWidth={2}
          className={`transition-transform duration-200 ${isReposted ? 'scale-110' : 'scale-100'}`}
        />
        <span className="text-xs">
          {formatLikeCount(repostCount)}
        </span>
      </button>

      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
}
