'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthSession } from '@/hooks/useAuthSession';
import { logger } from '@/lib/logger';

// Interfaz para los objetivos
interface Objective {
  id: string;
  entry_id: string;
  user_id: string;
  text: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

interface ObjectivesListProps {
  entryId: string;
  authorId: string | null;
  isDay: boolean;
  isEditing?: boolean; // Nuevo prop para indicar si el post está en modo edición
}

export default function ObjectivesList({ entryId, authorId, isDay, isEditing = false }: ObjectivesListProps) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [newObjectiveText, setNewObjectiveText] = useState('');
  const [showAllObjectives, setShowAllObjectives] = useState(false);
  const { session } = useAuthSession();
  
  // Verificar si el usuario actual es el autor del post
  const isAuthor = session?.user?.id === authorId;
  
  // Verificar si es un post temporal (recién creado)
  const isTemporaryPost = entryId.startsWith('temp-');
  
  // Cargar objetivos
  useEffect(() => {
    // Si es un post temporal, no intentamos cargar objetivos aún
    if (isTemporaryPost) {
      setLoading(false);
      return;
    }
    
    const fetchObjectives = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('objectives')
          .select('*')
          .eq('entry_id', entryId)
          .order('created_at', { ascending: true });
        
        if (error) {
          throw new Error(error.message);
        }
        
        setObjectives(data || []);
        setError(null); // Limpiar cualquier error previo
      } catch (err) {
        logger.error('Error al cargar objetivos', { error: String(err) });
        
        // Si hay error y aún no hemos intentado muchas veces, programamos un reintento
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          
          // Programar un reintento después de un tiempo
          setTimeout(() => {
            // Usar una función para asegurarnos de tener el valor más reciente de retryCount
            setRetryCount(currentRetryCount => {
              // Solo si aún estamos por debajo del límite
              if (currentRetryCount < 3) {
                fetchObjectives(); // Reintentar cargar los objetivos
              }
              return currentRetryCount;
            });
          }, 1000 * (retryCount + 1)); // Incrementar el tiempo entre reintentos
          
          // No mostrar error al usuario durante los reintentos
          setError(null);
        } else {
          // Después de varios intentos fallidos, mostramos un mensaje más amigable
          setError('No hay objetivos disponibles en este momento');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchObjectives();
  }, [entryId, isTemporaryPost, retryCount]);
  
  // Actualizar estado de un objetivo (completado/pendiente)
  const toggleObjectiveStatus = async (objectiveId: string, currentStatus: boolean) => {
    if (!isAuthor) return;
    
    try {
      // Actualizar optimistamente en la UI
      setObjectives(prev => 
        prev.map(obj => 
          obj.id === objectiveId ? { ...obj, done: !currentStatus } : obj
        )
      );
      
      // Actualizar en la base de datos usando la API
      const response = await fetch('/api/objectives', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectiveId,
          done: !currentStatus
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar objetivo');
      }
    } catch (err) {
      logger.error('Error al actualizar objetivo', { error: String(err) });
      // Revertir el cambio en la UI si hay error
      setObjectives(prev => 
        prev.map(obj => 
          obj.id === objectiveId ? { ...obj, done: currentStatus } : obj
        )
      );
      setError('No se pudo actualizar el objetivo');
      
      // Limpiar mensaje de error después de 3 segundos
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Eliminar un objetivo
  const deleteObjective = async (objectiveId: string) => {
    if (!isAuthor || !isEditing) return; // Solo permitir eliminar en modo edición
    
    try {
      // Eliminar optimistamente de la UI
      setObjectives(prev => prev.filter(obj => obj.id !== objectiveId));
      
      // Eliminar de la base de datos usando la API
      const response = await fetch(`/api/objectives?objectiveId=${objectiveId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar objetivo');
      }
    } catch (err) {
      logger.error('Error al eliminar objetivo', { error: String(err) });
      // Recargar los objetivos si hay error
      const { data } = await supabase
        .from('objectives')
        .select('*')
        .eq('entry_id', entryId);
      
      setObjectives(data || []);
      setError('No se pudo eliminar el objetivo');
      
      // Limpiar mensaje de error después de 3 segundos
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Añadir un nuevo objetivo
  const addNewObjective = async () => {
    if (!isAuthor || !isEditing || !newObjectiveText.trim()) return;
    
    try {
      // Crear el nuevo objetivo en la base de datos
      const { data, error: insertError } = await supabase
        .from('objectives')
        .insert({
          entry_id: entryId,
          user_id: session?.user?.id,
          text: newObjectiveText.trim(),
          done: false
        })
        .select();
      
      if (insertError) {
        throw new Error(insertError.message);
      }
      
      // Añadir el nuevo objetivo a la lista local
      if (data && data[0]) {
        setObjectives(prev => [...prev, data[0] as Objective]);
        setNewObjectiveText(''); // Limpiar el campo de texto
      }
    } catch (err) {
      logger.error('Error al añadir objetivo', { error: String(err) });
      setError('No se pudo añadir el objetivo');
      
      // Limpiar mensaje de error después de 3 segundos
      setTimeout(() => setError(null), 3000);
    }
  };
  
  // Si es un post temporal, no mostramos nada
  if (isTemporaryPost) {
    return null;
  }
  
  // Si está cargando, no mostramos nada para evitar parpadeos
  if (loading) {
    return null;
  }
  
  // Si hay error, no mostramos nada para posts recién creados
  if (error) {
    return null; // Simplemente no mostramos nada en caso de error
  }
  
  // Si no hay objetivos, no mostramos nada
  if (objectives.length === 0) {
    return null;
  }

  // No limitar el número de objetivos - mostrar todos los disponibles
  const limitedObjectives = objectives;
  
  // Determinar cuántos objetivos mostrar inicialmente (mantener 5 para el "Ver más")
  const initialDisplayCount = 5;
  const visibleObjectives = showAllObjectives ? limitedObjectives : limitedObjectives.slice(0, initialDisplayCount);
  const hasMoreObjectives = limitedObjectives.length > initialDisplayCount;
  
  return (
    <div className="mt-3 pt-2">
      <h4 className="text-sm font-medium mb-2">Objetivos:</h4>
      <ul className="space-y-2">
        {visibleObjectives.map((objective) => (
          <li 
            key={objective.id} 
            className={`flex items-center gap-2 p-2 rounded-md transition-opacity duration-200 ${
              isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
            } ${objective.done ? 'opacity-70' : ''}`}
            style={{ 
              minHeight: '40px', // Consistent height for better layout
              wordWrap: 'break-word' // Handle long text gracefully
            }}
          >
            {/* Checkbox - solo interactivo para el autor */}
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={objective.done}
                onChange={() => isAuthor && toggleObjectiveStatus(objective.id, objective.done)}
                disabled={!isAuthor}
                className={`w-4 h-4 cursor-${isAuthor ? 'pointer' : 'not-allowed'}`}
              />
            </div>
            
            {/* Texto del objetivo */}
            <span 
              className={`flex-grow text-sm ${objective.done ? 'line-through' : ''}`}
              style={{ 
                wordBreak: 'break-word', 
                hyphens: 'auto',
                lineHeight: '1.4'
              }}
            >
              {objective.text}
            </span>
            
            {/* Botón de eliminar - solo visible para el autor en modo edición */}
            {isAuthor && isEditing && (
              <button
                onClick={() => deleteObjective(objective.id)}
                className="p-1 rounded-full hover:bg-red-100 text-red-500"
                aria-label="Eliminar objetivo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
      
      {/* Botón "Ver más" si hay más de 5 objetivos */}
      {hasMoreObjectives && (
        <button
          type="button"
          onClick={() => setShowAllObjectives(!showAllObjectives)}
          className={`mt-2 text-sm font-medium ${
            isDay ? 'text-[#4A2E1B] hover:text-[#4A2E1B]/80' : 'text-[#F5F0E1] hover:text-[#F5F0E1]/80'
          }`}
        >
          {showAllObjectives ? 'Ver menos' : 'Ver más'}
        </button>
      )}
      
      {/* Formulario para añadir nuevos objetivos - solo visible en modo edición */}
      {isAuthor && isEditing && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newObjectiveText}
              onChange={(e) => setNewObjectiveText(e.target.value)}
              placeholder="Nuevo objetivo..."
              className={`flex-grow p-2 text-sm rounded-md ${
                isDay 
                  ? 'bg-white border-[#4A2E1B]/20 focus:border-[#4A2E1B]' 
                  : 'bg-[#3A2723] border-[#F5F0E1]/20 focus:border-[#F5F0E1]'
              } border focus:outline-none`}
            />
            <button
              type="button"
              onClick={addNewObjective}
              disabled={!newObjectiveText.trim()}
              className={`px-3 py-1 rounded-md text-sm ${
                newObjectiveText.trim() 
                  ? isDay 
                    ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:opacity-90' 
                    : 'bg-[#F5F0E1] text-[#2D1E1A] hover:opacity-90'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              Añadir
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 