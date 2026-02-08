import { useState, useEffect } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/logger';

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

interface NameUpdateFormProps {
  onNameUpdated?: (newName: string) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function NameUpdateForm({ 
  onNameUpdated, 
  className = '', 
  isExpanded = false,
  onToggleExpand
}: NameUpdateFormProps) {
  const { session } = useAuthSession();
  const { update: updateSession } = useSession();
  const [name, setName] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [bsyId, setBsyId] = useState('');
  const [canUpdate, setCanUpdate] = useState(false);
  const [needsNameInput, setNeedsNameInput] = useState(false);
  const [nextUpdateDate, setNextUpdateDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  
  // Use the time of day hook
  const isDay = useTimeOfDay();

  useEffect(() => {
    // Fetch user's name status
    const fetchNameStatus = async () => {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/user/name-status');
        
        if (!response.ok) {
          throw new Error('Error al obtener el estado del nombre');
        }
        
        const data = await response.json();
        
        setCurrentName(data.name || '');
        setName(data.name || '');
        setBsyId(session.user.bsy_id || '');
        setCanUpdate(data.canUpdate);
        setNeedsNameInput(data.needsNameInput);
        
        if (data.nextUpdateDate) {
          const nextDate = new Date(data.nextUpdateDate);
          setNextUpdateDate(nextDate);
          
          // Calculate days remaining
          const today = new Date();
          const diffTime = nextDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays > 0 ? diffDays : 0);
        }
      } catch (err) {
        logger.error('Error al obtener el estado del nombre', { error: String(err) });
        setError('Error al cargar la información de tu nombre');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNameStatus();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para actualizar tu nombre');
      return;
    }
    
    if (!canUpdate && !needsNameInput) {
      setError('Solo puedes actualizar tu nombre una vez cada 14 días');
      return;
    }
    
    if (!name.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }
    
    if (name.trim().length > 50) {
      setError('El nombre no puede exceder los 50 caracteres');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/user/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al actualizar el nombre');
      }
      
      const data = await response.json();
      
      setCurrentName(data.name);
      setCanUpdate(false);
      setNeedsNameInput(false);
      const newNextUpdateDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 días desde ahora
      setNextUpdateDate(newNextUpdateDate);
      setDaysRemaining(14);
      setSuccess('¡Nombre actualizado correctamente!');
      
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
        }, 1500);
      }
      
      if (onNameUpdated) {
        onNameUpdated(data.name);
      }
      
      // Auto collapse after successful update
      if (onToggleExpand) {
        setTimeout(() => {
          onToggleExpand();
        }, 2000);
      }
    } catch (err) {
      logger.error('Error al actualizar el nombre', { error: String(err) });
      setError(err instanceof Error ? err.message : 'Error al actualizar el nombre');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentName) {
    return (
      <div className={`p-4 ${className} ${isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]'}`}>
        Cargando...
      </div>
    );
  }

  // If not expanded, don't render the form
  if (!isExpanded) {
    return null;
  }

  return (
    <div className={`p-6 rounded-lg shadow-md transition-all duration-300 ${
      isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
    } ${className}`}>
      <h3 className="text-lg font-bold mb-4">Tu Identidad</h3>
      
      <div className="mb-6">
        <p className="text-sm font-medium mb-1 opacity-80">BSY ID (Permanente)</p>
        <p className="text-lg font-bold">{bsyId}</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Nombre de Perfil {!canUpdate && !needsNameInput && (
              <span className="font-normal text-xs opacity-70">
                {daysRemaining === 0 
                  ? '(Disponible hoy)'
                  : daysRemaining === 1 
                    ? '(Bloqueado - Disponible mañana)'
                    : `(Bloqueado - ${daysRemaining} días restantes)`
                }
              </span>
            )}
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors duration-300 ${
              isDay 
                ? 'bg-white border-[#4A2E1B] focus:ring-[#4A2E1B]/30 text-[#4A2E1B]' 
                : 'bg-[#3A2723] border-[#F5F0E1] focus:ring-[#F5F0E1]/30 text-[#F5F0E1]'
            } ${!canUpdate && !needsNameInput ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder="Ingresa tu nombre de perfil"
            maxLength={50}
            disabled={!canUpdate && !needsNameInput}
            style={{
              fontSize: '16px', // Prevent zoom on iOS
            }}
          />
          <p className="text-xs mt-2 opacity-70">
            {name.length}/50 caracteres
          </p>
        </div>
        
        {(canUpdate || needsNameInput) && (
          <button
            type="submit"
            className={`w-full py-3 px-6 font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
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
            {loading ? 'Actualizando...' : 'Actualizar Nombre'}
          </button>
        )}
        
        {!canUpdate && !needsNameInput && nextUpdateDate && (
          <p className="text-sm opacity-70 mb-4">
            {daysRemaining === 0 
              ? 'Podrás actualizar tu nombre hoy mismo'
              : daysRemaining === 1 
                ? 'Podrás actualizar tu nombre mañana'
                : `Podrás actualizar tu nombre en ${daysRemaining} días`
            }
          </p>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}
      </form>
    </div>
  );
} 