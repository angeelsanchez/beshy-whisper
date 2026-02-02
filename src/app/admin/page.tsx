'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Challenge } from '@/types/challenge';

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
    </div>
  );
}