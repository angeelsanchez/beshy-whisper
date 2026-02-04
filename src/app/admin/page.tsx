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

export default function AdminPage() {
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

  // Check if user is admin
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
      
      // Remove the deleted entry from state
      setEntries(entries.filter(entry => entry.id !== id));
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Error deleting entry');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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

  if (status === 'loading') {
    return (
      <div className="w-full max-w-[800px] mx-auto px-5 py-8 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="w-full max-w-[800px] mx-auto px-5 py-8">
      <h1 className="text-2xl font-bold font-montserrat mb-6">Admin Panel</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <p className="text-center">Loading entries...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">ID</th>
                <th className="py-2 px-4 border-b text-left">User</th>
                <th className="py-2 px-4 border-b text-left">Message</th>
                <th className="py-2 px-4 border-b text-left">Date</th>
                <th className="py-2 px-4 border-b text-left">Time Frame</th>
                <th className="py-2 px-4 border-b text-left">IP</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{entry.id.slice(0, 8)}...</td>
                  <td className="py-2 px-4 border-b">
                    {entry.guest 
                      ? `${entry.nombre} (Guest)` 
                      : entry.users?.alias || 'Unknown'}
                  </td>
                  <td className="py-2 px-4 border-b max-w-xs truncate">
                    {entry.mensaje}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {formatDate(entry.fecha)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {entry.franja}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {entry.ip}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              
              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center">
                    No entries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Challenges Section */}
      <h2 className="text-xl font-bold font-montserrat mt-10 mb-4">Retos Semanales</h2>

      {challengeError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {challengeError}
        </div>
      )}

      <form onSubmit={handleCreateChallenge} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
        <h3 className="font-semibold text-sm">Crear nuevo reto</h3>
        <input
          type="text"
          placeholder="Titulo *"
          value={newChallenge.title}
          onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
          className="w-full p-2 border rounded text-sm"
          maxLength={100}
        />
        <textarea
          placeholder="Descripcion *"
          value={newChallenge.description}
          onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
          className="w-full p-2 border rounded text-sm resize-none"
          rows={2}
          maxLength={500}
        />
        <input
          type="text"
          placeholder="Tema (opcional)"
          value={newChallenge.theme}
          onChange={(e) => setNewChallenge(prev => ({ ...prev, theme: e.target.value }))}
          className="w-full p-2 border rounded text-sm"
          maxLength={50}
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="challenge-start-date" className="text-xs text-gray-500">Fecha inicio *</label>
            <input
              id="challenge-start-date"
              type="date"
              value={newChallenge.start_date}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="challenge-end-date" className="text-xs text-gray-500">Fecha fin *</label>
            <input
              id="challenge-end-date"
              type="date"
              value={newChallenge.end_date}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Crear reto
        </button>
      </form>

      {challengesLoading ? (
        <p className="text-center text-sm">Cargando retos...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left text-sm">Titulo</th>
                <th className="py-2 px-4 border-b text-left text-sm">Tema</th>
                <th className="py-2 px-4 border-b text-left text-sm">Inicio</th>
                <th className="py-2 px-4 border-b text-left text-sm">Fin</th>
                <th className="py-2 px-4 border-b text-left text-sm">Activo</th>
                <th className="py-2 px-4 border-b text-left text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((challenge) => (
                <tr key={challenge.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-sm">{challenge.title}</td>
                  <td className="py-2 px-4 border-b text-sm">{challenge.theme || '-'}</td>
                  <td className="py-2 px-4 border-b text-sm">{challenge.start_date}</td>
                  <td className="py-2 px-4 border-b text-sm">{challenge.end_date}</td>
                  <td className="py-2 px-4 border-b text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      challenge.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {challenge.is_active ? 'Si' : 'No'}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b text-sm">
                    <button
                      onClick={() => toggleChallengeActive(challenge.id, challenge.is_active)}
                      className={`text-sm ${
                        challenge.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {challenge.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {challenges.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-sm">
                    No hay retos creados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Initiatives Section */}
      <h2 className="text-xl font-bold font-montserrat mt-10 mb-4">Iniciativas Comunitarias</h2>

      {initiativeError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {initiativeError}
        </div>
      )}

      <form onSubmit={handleCreateInitiative} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
        <h3 className="font-semibold text-sm">Crear nueva iniciativa</h3>
        <input
          type="text"
          placeholder="Nombre *"
          value={newInitiative.name}
          onChange={(e) => setNewInitiative(prev => ({ ...prev, name: e.target.value }))}
          className="w-full p-2 border rounded text-sm"
          maxLength={100}
        />
        <textarea
          placeholder="Descripción *"
          value={newInitiative.description}
          onChange={(e) => setNewInitiative(prev => ({ ...prev, description: e.target.value }))}
          className="w-full p-2 border rounded text-sm resize-none"
          rows={2}
          maxLength={500}
        />
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Icono (emoji)"
            value={newInitiative.icon}
            onChange={(e) => setNewInitiative(prev => ({ ...prev, icon: e.target.value }))}
            className="w-20 p-2 border rounded text-sm text-center"
            maxLength={10}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="init-color" className="text-xs text-gray-500">Color</label>
            <input
              id="init-color"
              type="color"
              value={newInitiative.color}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, color: e.target.value }))}
              className="w-8 h-8 border rounded cursor-pointer"
            />
          </div>
          <select
            value={newInitiative.category}
            onChange={(e) => setNewInitiative(prev => ({ ...prev, category: e.target.value }))}
            className="flex-1 p-2 border rounded text-sm"
          >
            <option value="">Categoría (opcional)</option>
            <option value="health">Salud</option>
            <option value="mind">Mente</option>
            <option value="productivity">Productividad</option>
            <option value="wellness">Bienestar</option>
            <option value="social">Social</option>
            <option value="creativity">Creatividad</option>
          </select>
        </div>
        <div className="flex gap-3">
          <select
            value={newInitiative.trackingType}
            onChange={(e) => setNewInitiative(prev => ({ ...prev, trackingType: e.target.value }))}
            className="w-40 p-2 border rounded text-sm"
          >
            <option value="binary">Check-in</option>
            <option value="quantity">Cantidad</option>
            <option value="timer">Temporizador</option>
          </select>
          {newInitiative.trackingType !== 'binary' && (
            <>
              <input
                type="number"
                placeholder="Meta *"
                value={newInitiative.targetValue}
                onChange={(e) => setNewInitiative(prev => ({ ...prev, targetValue: e.target.value }))}
                className="w-24 p-2 border rounded text-sm"
                min="1"
              />
              <input
                type="text"
                placeholder="Unidad *"
                value={newInitiative.unit}
                onChange={(e) => setNewInitiative(prev => ({ ...prev, unit: e.target.value }))}
                className="flex-1 p-2 border rounded text-sm"
                maxLength={20}
              />
            </>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="init-start-date" className="text-xs text-gray-500">Inicio *</label>
            <input
              id="init-start-date"
              type="date"
              value={newInitiative.startDate}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="init-end-date" className="text-xs text-gray-500">Fin (opcional)</label>
            <input
              id="init-end-date"
              type="date"
              value={newInitiative.endDate}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div className="w-28">
            <label htmlFor="init-max-part" className="text-xs text-gray-500">Máx. personas</label>
            <input
              id="init-max-part"
              type="number"
              placeholder="Sin límite"
              value={newInitiative.maxParticipants}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, maxParticipants: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
              min="1"
            />
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="w-32">
            <label htmlFor="init-reminder" className="text-xs text-gray-500">Recordatorio</label>
            <input
              id="init-reminder"
              type="time"
              value={newInitiative.reminderTime}
              onChange={(e) => setNewInitiative(prev => ({ ...prev, reminderTime: e.target.value }))}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Crear iniciativa
          </button>
        </div>
      </form>

      {initiativesLoading ? (
        <p className="text-center text-sm">Cargando iniciativas...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-3 border-b text-left text-sm">Nombre</th>
                <th className="py-2 px-3 border-b text-left text-sm">Tipo</th>
                <th className="py-2 px-3 border-b text-left text-sm">Participantes</th>
                <th className="py-2 px-3 border-b text-left text-sm">Racha</th>
                <th className="py-2 px-3 border-b text-left text-sm">Inicio</th>
                <th className="py-2 px-3 border-b text-left text-sm">Activa</th>
                <th className="py-2 px-3 border-b text-left text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {initiatives.map((init) => (
                <tr key={init.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 border-b text-sm">
                    {init.icon && <span className="mr-1">{init.icon}</span>}
                    {init.name}
                  </td>
                  <td className="py-2 px-3 border-b text-sm">
                    {init.tracking_type === 'binary' ? 'Check-in' :
                     init.tracking_type === 'quantity' ? `${init.target_value} ${init.unit}` :
                     `${init.target_value} ${init.unit} (timer)`}
                  </td>
                  <td className="py-2 px-3 border-b text-sm">{init.participant_count}</td>
                  <td className="py-2 px-3 border-b text-sm">{init.community_streak > 0 ? `🔥 ${init.community_streak}` : '-'}</td>
                  <td className="py-2 px-3 border-b text-sm">{init.start_date}</td>
                  <td className="py-2 px-3 border-b text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      init.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {init.is_active ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-2 px-3 border-b text-sm">
                    <button
                      onClick={() => toggleInitiativeActive(init.id, init.is_active)}
                      className={`text-sm ${
                        init.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {init.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {initiatives.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-sm">
                    No hay iniciativas creadas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}