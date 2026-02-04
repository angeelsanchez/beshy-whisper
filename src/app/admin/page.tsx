'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Challenge } from '@/types/challenge';
import type { Initiative } from '@/types/initiative';

interface Entry {
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
  };
}

type AdminTab = 'entries' | 'challenges' | 'initiatives';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('entries');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const router = useRouter();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    theme: '',
    start_date: '',
    end_date: '',
  });
  const [challengeError, setChallengeError] = useState('');

  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [initiativesLoading, setInitiativesLoading] = useState(false);
  const [newInitiative, setNewInitiative] = useState({
    name: '',
    description: '',
    icon: '',
    color: '#4A2E1B',
    category: '' as string,
    trackingType: 'binary' as string,
    targetValue: '',
    unit: '',
    startDate: '',
    endDate: '',
    maxParticipants: '',
    reminderTime: '',
  });
  const [initiativeError, setInitiativeError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/feed');
      return;
    }

    fetchEntries();
    fetchChallenges();
    fetchInitiatives();
  }, [session, status, router]);

  const fetchEntries = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('entries')
        .select(`
          *,
          users:user_id (
            alias
          )
        `)
        .order('fecha', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setEntries(data);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Error loading entries');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setEntries(entries.filter(entry => entry.id !== id));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Error deleting entry');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const fetchChallenges = async () => {
    setChallengesLoading(true);
    try {
      const res = await fetch('/api/challenges');
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges ?? []);
      }
    } catch {
      setChallengeError('Error cargando retos');
    } finally {
      setChallengesLoading(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setChallengeError('');

    if (!newChallenge.title.trim() || !newChallenge.description.trim() || !newChallenge.start_date || !newChallenge.end_date) {
      setChallengeError('Todos los campos obligatorios deben estar rellenos');
      return;
    }

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newChallenge,
          theme: newChallenge.theme.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setChallengeError(data.error || 'Error al crear reto');
        return;
      }

      setNewChallenge({ title: '', description: '', theme: '', start_date: '', end_date: '' });
      await fetchChallenges();
    } catch {
      setChallengeError('Error de red al crear reto');
    }
  };

  const toggleChallengeActive = async (challengeId: string, currentActive: boolean) => {
    const { error: updateError } = await supabase
      .from('challenges')
      .update({ is_active: !currentActive })
      .eq('id', challengeId);

    if (!updateError) {
      setChallenges(prev =>
        prev.map(c => c.id === challengeId ? { ...c, is_active: !currentActive } : c)
      );
    }
  };

  const fetchInitiatives = async () => {
    setInitiativesLoading(true);
    try {
      const res = await fetch('/api/initiatives?limit=50');
      if (res.ok) {
        const data = await res.json();
        setInitiatives(data.initiatives ?? []);
      }
    } catch {
      setInitiativeError('Error cargando iniciativas');
    } finally {
      setInitiativesLoading(false);
    }
  };

  const handleCreateInitiative = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitiativeError('');

    if (!newInitiative.name.trim() || !newInitiative.description.trim() || !newInitiative.startDate) {
      setInitiativeError('Nombre, descripción y fecha de inicio son obligatorios');
      return;
    }

    const payload: Record<string, unknown> = {
      name: newInitiative.name.trim(),
      description: newInitiative.description.trim(),
      icon: newInitiative.icon.trim() || undefined,
      color: newInitiative.color,
      category: newInitiative.category || undefined,
      trackingType: newInitiative.trackingType,
      startDate: newInitiative.startDate,
      endDate: newInitiative.endDate || undefined,
      reminderTime: newInitiative.reminderTime || undefined,
    };

    if (newInitiative.trackingType !== 'binary') {
      const tv = Number(newInitiative.targetValue);
      if (!tv || tv <= 0 || !newInitiative.unit.trim()) {
        setInitiativeError('Cantidad y unidad son obligatorios para este tipo de tracking');
        return;
      }
      payload.targetValue = tv;
      payload.unit = newInitiative.unit.trim();
    }

    const mp = Number(newInitiative.maxParticipants);
    if (newInitiative.maxParticipants && mp > 0) {
      payload.maxParticipants = mp;
    }

    try {
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setInitiativeError(data.error || 'Error al crear iniciativa');
        return;
      }

      setNewInitiative({
        name: '', description: '', icon: '', color: '#4A2E1B',
        category: '', trackingType: 'binary', targetValue: '', unit: '',
        startDate: '', endDate: '', maxParticipants: '', reminderTime: '',
      });
      await fetchInitiatives();
    } catch {
      setInitiativeError('Error de red al crear iniciativa');
    }
  };

  const toggleInitiativeActive = async (initId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/initiatives/${initId}`, {
        method: currentActive ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: currentActive ? undefined : JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        setInitiatives(prev =>
          prev.map(i => i.id === initId ? { ...i, is_active: !currentActive } : i)
        );
      }
    } catch {
      setInitiativeError('Error al cambiar estado');
    }
  };

  const trackingLabel = (type: string, target: number | null, unit: string | null): string => {
    if (type === 'binary') return 'Check-in';
    const label = `${target ?? '?'} ${unit ?? ''}`;
    if (type === 'quantity') return label;
    return `${label} (timer)`;
  };

  if (status === 'loading') {
    return (
      <div className="w-full max-w-[800px] mx-auto px-4 py-8 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session?.user?.role || session.user.role !== 'admin') {
    return null;
  }

  const tabs: { key: AdminTab; label: string; count: number }[] = [
    { key: 'entries', label: 'Whispers', count: entries.length },
    { key: 'challenges', label: 'Retos', count: challenges.length },
    { key: 'initiatives', label: 'Iniciativas', count: initiatives.length },
  ];

  return (
    <div className="w-full max-w-[800px] mx-auto px-4 py-6">
      <h1 className="text-xl font-bold font-montserrat mb-4">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1 text-xs ${activeTab === tab.key ? 'text-gray-500' : 'text-gray-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
          )}

          {loading ? (
            <p className="text-center text-sm text-gray-500">Cargando whispers...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No hay whispers</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {entry.guest
                            ? `${entry.nombre} (Guest)`
                            : entry.users?.alias || 'Unknown'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.franja === 'DIA'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {entry.franja}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{entry.mensaje}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{formatDate(entry.fecha)}</span>
                        <span>{entry.ip}</span>
                        <span className="font-mono">{entry.id.slice(0, 8)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="shrink-0 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div>
          {challengeError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{challengeError}</div>
          )}

          <form onSubmit={handleCreateChallenge} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">Crear nuevo reto</h3>
            <input
              type="text"
              placeholder="Título *"
              value={newChallenge.title}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-2.5 border rounded-lg text-sm"
              maxLength={100}
            />
            <textarea
              placeholder="Descripción *"
              value={newChallenge.description}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2.5 border rounded-lg text-sm resize-none"
              rows={2}
              maxLength={500}
            />
            <input
              type="text"
              placeholder="Tema (opcional)"
              value={newChallenge.theme}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, theme: e.target.value }))}
              className="w-full p-2.5 border rounded-lg text-sm"
              maxLength={50}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="challenge-start-date" className="text-xs text-gray-500 mb-1 block">Inicio *</label>
                <input
                  id="challenge-start-date"
                  type="date"
                  value={newChallenge.start_date}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label htmlFor="challenge-end-date" className="text-xs text-gray-500 mb-1 block">Fin *</label>
                <input
                  id="challenge-end-date"
                  type="date"
                  value={newChallenge.end_date}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Crear reto
            </button>
          </form>

          {challengesLoading ? (
            <p className="text-center text-sm text-gray-500">Cargando retos...</p>
          ) : challenges.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No hay retos creados</p>
          ) : (
            <div className="space-y-2">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{challenge.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          challenge.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {challenge.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {challenge.theme && (
                        <span className="text-xs text-gray-500">Tema: {challenge.theme}</span>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {challenge.start_date} → {challenge.end_date}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleChallengeActive(challenge.id, challenge.is_active)}
                      className={`shrink-0 text-xs px-2 py-1 rounded hover:bg-opacity-10 ${
                        challenge.is_active
                          ? 'text-red-500 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {challenge.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initiatives Tab */}
      {activeTab === 'initiatives' && (
        <div>
          {initiativeError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{initiativeError}</div>
          )}

          <form onSubmit={handleCreateInitiative} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">Crear nueva iniciativa</h3>
            <input
              type="text"
              placeholder="Nombre *"
              value={newInitiative.name}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2.5 border rounded-lg text-sm"
              maxLength={100}
            />
            <textarea
              placeholder="Descripción *"
              value={newInitiative.description}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2.5 border rounded-lg text-sm resize-none"
              rows={2}
              maxLength={500}
            />
            <div className="grid grid-cols-[auto_auto_1fr] gap-2 items-end">
              <div>
                <label htmlFor="init-icon" className="text-xs text-gray-500 mb-1 block">Icono</label>
                <input
                  id="init-icon"
                  type="text"
                  placeholder="🎯"
                  value={newInitiative.icon}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, icon: e.target.value }))}
                  className="w-14 p-2.5 border rounded-lg text-sm text-center"
                  maxLength={10}
                />
              </div>
              <div>
                <label htmlFor="init-color" className="text-xs text-gray-500 mb-1 block">Color</label>
                <input
                  id="init-color"
                  type="color"
                  value={newInitiative.color}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-[42px] border rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="init-category" className="text-xs text-gray-500 mb-1 block">Categoría</label>
                <select
                  id="init-category"
                  value={newInitiative.category}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg text-sm"
                >
                  <option value="">Opcional</option>
                  <option value="health">Salud</option>
                  <option value="mind">Mente</option>
                  <option value="productivity">Productividad</option>
                  <option value="wellness">Bienestar</option>
                  <option value="social">Social</option>
                  <option value="creativity">Creatividad</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="init-tracking" className="text-xs text-gray-500 mb-1 block">Tipo de tracking</label>
              <select
                id="init-tracking"
                value={newInitiative.trackingType}
                onChange={(e) => setNewInitiative(prev => ({ ...prev, trackingType: e.target.value }))}
                className="w-full p-2.5 border rounded-lg text-sm"
              >
                <option value="binary">Check-in (sí/no diario)</option>
                <option value="quantity">Cantidad (meta numérica)</option>
                <option value="timer">Temporizador (minutos)</option>
              </select>
            </div>

            {newInitiative.trackingType !== 'binary' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="init-target" className="text-xs text-gray-500 mb-1 block">Meta *</label>
                  <input
                    id="init-target"
                    type="number"
                    placeholder="Ej: 10"
                    value={newInitiative.targetValue}
                    onChange={(e) => setNewInitiative(prev => ({ ...prev, targetValue: e.target.value }))}
                    className="w-full p-2.5 border rounded-lg text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="init-unit" className="text-xs text-gray-500 mb-1 block">Unidad *</label>
                  <input
                    id="init-unit"
                    type="text"
                    placeholder="Ej: min, vasos, km"
                    value={newInitiative.unit}
                    onChange={(e) => setNewInitiative(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-2.5 border rounded-lg text-sm"
                    maxLength={20}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="init-start-date" className="text-xs text-gray-500 mb-1 block">Inicio *</label>
                <input
                  id="init-start-date"
                  type="date"
                  value={newInitiative.startDate}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label htmlFor="init-end-date" className="text-xs text-gray-500 mb-1 block">Fin (opcional)</label>
                <input
                  id="init-end-date"
                  type="date"
                  value={newInitiative.endDate}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="init-max-part" className="text-xs text-gray-500 mb-1 block">Máx. personas</label>
                <input
                  id="init-max-part"
                  type="number"
                  placeholder="Sin límite"
                  value={newInitiative.maxParticipants}
                  onChange={(e) => setNewInitiative(prev => ({ ...prev, maxParticipants: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg text-sm"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="init-reminder" className="text-xs text-gray-500 mb-1 block">Recordatorio</label>
                <div className="border rounded-lg overflow-hidden">
                  <input
                    id="init-reminder"
                    type="time"
                    value={newInitiative.reminderTime}
                    onChange={(e) => setNewInitiative(prev => ({ ...prev, reminderTime: e.target.value }))}
                    className="w-full p-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Crear iniciativa
            </button>
          </form>

          {initiativesLoading ? (
            <p className="text-center text-sm text-gray-500">Cargando iniciativas...</p>
          ) : initiatives.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No hay iniciativas creadas</p>
          ) : (
            <div className="space-y-2">
              {initiatives.map((init) => (
                <div key={init.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">
                          {init.icon && <span className="mr-1">{init.icon}</span>}
                          {init.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          init.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {init.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                        <span>{trackingLabel(init.tracking_type, init.target_value, init.unit)}</span>
                        <span>{init.participant_count} participantes</span>
                        {init.community_streak > 0 && <span>🔥 {init.community_streak}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Desde {init.start_date}
                        {init.end_date ? ` → ${init.end_date}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleInitiativeActive(init.id, init.is_active)}
                      className={`shrink-0 text-xs px-2 py-1 rounded ${
                        init.is_active
                          ? 'text-red-500 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {init.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
