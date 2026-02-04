'use client';

import { useState } from 'react';
import { X, Search, Link2, Loader2 } from 'lucide-react';
import type { Habit } from '@/hooks/useHabits';
import Avatar from '@/components/Avatar';

interface SearchedUser {
  id: string;
  name: string | null;
  alias: string;
  profile_photo_url: string | null;
}

interface HabitLinkRequestModalProps {
  readonly isOpen: boolean;
  readonly isDay: boolean;
  readonly myHabits: Habit[];
  readonly onClose: () => void;
  readonly onSubmit: (responderId: string, habitId: string, message?: string) => Promise<boolean>;
}

export default function HabitLinkRequestModal({
  isOpen,
  isDay,
  myHabits,
  onClose,
  onSubmit,
}: HabitLinkRequestModalProps): React.ReactElement | null {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const bg = isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]';
  const text = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const inputBg = isDay ? 'bg-white border-[#4A2E1B]/20' : 'bg-[#3A2723] border-[#F5F0E1]/20';

  const handleSearch = async (): Promise<void> => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) {
        setError('Error al buscar usuarios');
        setSearching(false);
        return;
      }
      const data = await res.json();
      setSearchResults(data.users ?? []);
    } catch {
      setError('Error de conexión');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedUser || !selectedHabitId) return;
    setSubmitting(true);
    setError('');
    const success = await onSubmit(
      selectedUser.id,
      selectedHabitId,
      message.trim() || undefined
    );
    setSubmitting(false);
    if (success) {
      onClose();
    } else {
      setError('No se pudo enviar la solicitud');
    }
  };

  const handleClose = (): void => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setSelectedHabitId('');
    setMessage('');
    setError('');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />
      <div className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-50 rounded-xl shadow-xl p-5 ${bg} ${text}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Link2 className="w-4 h-4" strokeWidth={2} />
            Vincular hábito
          </h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:opacity-70">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {!selectedUser ? (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar usuario..."
                className={`flex-1 text-xs p-2.5 rounded-lg border ${inputBg} ${text}`}
              />
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.trim().length < 2}
                className={`px-3 rounded-lg text-xs font-medium ${
                  isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
                } disabled:opacity-40`}
              >
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left text-xs transition-all ${
                    isDay ? 'hover:bg-[#4A2E1B]/8' : 'hover:bg-[#F5F0E1]/8'
                  }`}
                >
                  <Avatar src={user.profile_photo_url} name={user.name || user.alias} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block truncate">{user.name || user.alias}</span>
                    <span className="opacity-50 block truncate">{user.alias}</span>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <p className="text-center text-xs opacity-50 py-4">No se encontraron usuarios</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 p-2.5 rounded-lg ${
              isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
            }`}>
              <Avatar src={selectedUser.profile_photo_url} name={selectedUser.name || selectedUser.alias} size="sm" />
              <span className="text-xs font-medium flex-1">{selectedUser.name || selectedUser.alias}</span>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[10px] opacity-50 hover:opacity-80"
              >
                Cambiar
              </button>
            </div>

            <div>
              <label htmlFor="link-habit-select" className="text-[11px] font-medium mb-1 block opacity-70">
                Tu hábito a vincular
              </label>
              <select
                id="link-habit-select"
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className={`w-full text-xs p-2.5 rounded-lg border ${inputBg} ${text}`}
              >
                <option value="">Selecciona un hábito...</option>
                {myHabits.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="link-message" className="text-[11px] font-medium mb-1 block opacity-70">
                Mensaje (opcional)
              </label>
              <input
                id="link-message"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej: ¿Hacemos gym juntos?"
                maxLength={200}
                className={`w-full text-xs p-2.5 rounded-lg border ${inputBg} ${text}`}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedHabitId}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                isDay ? 'bg-[#4A2E1B] text-[#F5F0E1]' : 'bg-[#F5F0E1] text-[#2D1E1A]'
              } disabled:opacity-40 flex items-center justify-center gap-2`}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              Enviar solicitud
            </button>
          </div>
        )}
      </div>
    </>
  );
}
