'use client';

import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useUserSearch } from '@/hooks/useUserSearch';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import FollowButton from '@/components/FollowButton';

export default function SearchPage() {
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuthSession();
  const { isDay } = useTheme();
  const { users, total, loading, query, hasMore, setQuery, loadMore } = useUserSearch();

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
      }`}>
        <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
          Cargando...
        </p>
      </div>
    );
  }

  if (!session) {
    router.replace('/login');
    return null;
  }

  return (
    <div className={`min-h-screen pb-24 lg:pb-8 lg:pl-20 ${
      isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
    }`}>
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <h1 className={`text-xl font-bold ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
          Buscar usuarios
        </h1>

        <div className="relative">
          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
            isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </div>
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Buscar por nombre, alias o BSY ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={`w-full pl-10 pr-10 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 ${
              isDay
                ? 'bg-white border-[#4A2E1B]/20 focus:border-[#4A2E1B] focus:ring-[#4A2E1B]/20 text-[#4A2E1B] placeholder-[#4A2E1B]/40'
                : 'bg-[#3A2723] border-[#F5F0E1]/20 focus:border-[#F5F0E1] focus:ring-[#F5F0E1]/20 text-[#F5F0E1] placeholder-[#F5F0E1]/40'
            }`}
            aria-label="Buscar usuarios"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer ${
                isDay ? 'text-[#4A2E1B]/50 hover:text-[#4A2E1B]' : 'text-[#F5F0E1]/50 hover:text-[#F5F0E1]'
              }`}
              aria-label="Limpiar búsqueda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          )}
        </div>

        {query.trim() && !loading && (
          <p className={`text-sm ${isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60'}`}>
            {total === 0
              ? 'Sin resultados'
              : `${total} usuario${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        )}

        <div className="space-y-3">
          {users.map(user => (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isDay ? 'bg-[#4A2E1B]/5 hover:bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/5 hover:bg-[#F5F0E1]/10'
              }`}
            >
              <Link href={`/profile?user=${user.id}`} className="shrink-0">
                <Avatar
                  src={user.profile_photo_url}
                  name={user.name || user.alias}
                  size="md"
                />
              </Link>

              <Link
                href={`/profile?user=${user.id}`}
                className={`flex-1 min-w-0 ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}
              >
                <p className="font-medium text-sm truncate">{user.name || user.alias}</p>
                <p className="text-xs opacity-60 truncate">@{user.bsy_id || user.alias}</p>
                {user.bio && (
                  <p className="text-xs opacity-50 truncate mt-0.5">{user.bio}</p>
                )}
              </Link>

              <div className="shrink-0">
                <FollowButton targetUserId={user.id} isDay={isDay} compact />
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className={`text-center py-4 text-sm opacity-70 ${
            isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'
          }`} aria-live="polite">
            Buscando...
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            onClick={loadMore}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              isDay
                ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20'
                : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20'
            }`}
          >
            Ver más
          </button>
        )}

        {!query.trim() && !loading && (
          <div className={`text-center py-12 ${isDay ? 'text-[#4A2E1B]/40' : 'text-[#F5F0E1]/40'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" className="mx-auto mb-3 opacity-50">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <p className="text-sm">Busca usuarios por nombre, alias o BSY ID</p>
          </div>
        )}
      </div>
    </div>
  );
}
