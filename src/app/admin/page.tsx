'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    // Here you would typically check if the user has admin rights
    // For simplicity, we're just checking if they're authenticated
    // In a real app, you'd have an admin role in your database
    
    fetchEntries();
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

  if (status === 'loading') {
    return (
      <div className="w-full max-w-[800px] mx-auto px-5 py-8 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
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
    </div>
  );
} 