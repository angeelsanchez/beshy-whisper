import { useState, useEffect, useRef } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useSession } from 'next-auth/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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

interface NameInputModalProps {
  onClose: () => void;
}

export default function NameInputModal({ onClose }: Readonly<NameInputModalProps>) {
  const { session } = useAuthSession();
  const { update: updateSession } = useSession();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsNameInput, setNeedsNameInput] = useState(false);
  const [bsyId, setBsyId] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { isActive: needsNameInput, onClose });
  
  // Use the time of day hook
  const isDay = useTimeOfDay();

  useEffect(() => {
    // Check if user needs to set their name
    const checkNameStatus = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch('/api/user/name-status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch name status');
        }
        
        const data = await response.json();
        
        setName(data.name || '');
        setBsyId(session.user.bsy_id || '');
        setNeedsNameInput(data.needsNameInput);
        
        // If user doesn't need to set their name, close the modal
        if (!data.needsNameInput) {
          onClose();
        }
      } catch (err) {
        console.error('Error checking name status:', err);
      }
    };
    
    checkNameStatus();
  }, [session, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setError('You must be logged in to set your name');
      return;
    }
    
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    
    if (name.trim().length > 50) {
      setError('Name cannot exceed 50 characters');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update name');
      }
      
      const data = await response.json();
      
      // Actualizar la sesión de NextAuth para reflejar el cambio de nombre
      if (session?.user) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name: data.name
          }
        });
        
        // Forzar recarga de la página para actualizar el nombre en todos los componentes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      // Close the modal on success
      onClose();
    } catch (err) {
      console.error('Error updating name:', err);
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  // Don't render the modal if user doesn't need to set their name
  if (!needsNameInput) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-modal-title"
        className={`relative rounded-lg shadow-lg max-w-md w-full p-6 transition-all duration-300 ${
          isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
        }`}
      >
        <h2 id="name-modal-title" className="text-xl font-bold mb-6">Completa tu perfil</h2>

        <div className="mb-6">
          <p className="text-sm font-medium mb-1 opacity-80">Tu identificador unico</p>
          <p className="text-lg font-bold">{bsyId}</p>
          <p className="text-xs opacity-70 mt-1">Este identificador es permanente y no se puede cambiar.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="modal-name" className="block text-sm font-medium mb-2">
              ¿Cómo quieres que te llamemos?
            </label>
            <input
              type="text"
              id="modal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors duration-300 ${
                isDay
                  ? 'bg-white border-[#4A2E1B] focus:ring-[#4A2E1B]/30 text-[#4A2E1B]'
                  : 'bg-[#3A2723] border-[#F5F0E1] focus:ring-[#F5F0E1]/30 text-[#F5F0E1]'
              }`}
              placeholder="Escribe tu nombre"
              maxLength={50}
              aria-required="true"
              aria-describedby={error ? 'name-modal-error' : undefined}
              style={{
                fontSize: '16px',
              }}
            />
            <p className="text-xs mt-2 opacity-70">
              {name.length}/50 caracteres
            </p>
          </div>

          {error && (
            <div id="name-modal-error" role="alert" className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 font-medium rounded-lg transition-all duration-300 ${
                isDay
                  ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20'
                  : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20'
              }`}
              disabled={loading}
            >
              Omitir
            </button>
            <button
              type="submit"
              className={`px-6 py-3 font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-md active:scale-[0.98]'
              } ${
                isDay
                  ? 'bg-[#4A2E1B] text-[#F5F0E1]'
                  : 'bg-[#F5F0E1] text-[#2D1E1A]'
              }`}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar nombre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 