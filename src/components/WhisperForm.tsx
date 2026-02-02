'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePostContext, EntryWithUser } from '@/context/PostContext';

interface Objective {
  id: string;
  text: string;
}

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

export default function WhisperForm() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Guardado');
  const [error, setError] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const { addLocalPost, refreshPosts } = usePostContext();
  
  // Estado para los objetivos
  const [objectives, setObjectives] = useState<Objective[]>([]);
  
  // Use our custom hook to determine time of day
  const isDay = useTimeOfDay();

  // Handle mobile keyboard and viewport changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const screenHeight = window.screen.height;
      
      setViewportHeight(currentHeight);
      setKeyboardVisible(currentHeight < screenHeight * 0.75);
    };

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const screenHeight = window.screen.height;
        
        setViewportHeight(currentHeight);
        setKeyboardVisible(currentHeight < screenHeight * 0.75);
      }
    };

    // Initial setup
    handleResize();

    // Event listeners
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);

  // Auto-resize textarea and scroll into view on focus
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
      if (window.innerWidth <= 768) { // Mobile only
        setTimeout(() => {
          textarea.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 300); // Delay to allow keyboard to appear
      }
    };

    const handleInput = () => {
      // Auto-resize textarea
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    };

    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('input', handleInput);

    return () => {
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('input', handleInput);
    };
  }, []);

  // Clear guest state when user authenticates
  useEffect(() => {
    if (session?.user?.id) {
      const wasGuest = sessionStorage.getItem('isGuest') === 'true';
      if (wasGuest) {
        sessionStorage.removeItem('isGuest');
        sessionStorage.removeItem('guestHasPosted');
        sessionStorage.removeItem('guestName');
      }
    }
  }, [session]);

  // Get current time in hh:mm AM/PM format
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Check if user can post (limit: 1 day post and 1 night post per day)
  const canUserPost = async (franja: 'DIA' | 'NOCHE'): Promise<boolean> => {
    if (!session?.user.id && !sessionStorage.getItem('isGuest')) {
      router.push('/login');
      return false;
    }
    
    // Guest users can only post once
    if (sessionStorage.getItem('isGuest') === 'true') {
      const hasPosted = sessionStorage.getItem('guestHasPosted');
      if (hasPosted) {
        setError('Los invitados solo pueden publicar un susurro.');
        return false;
      }
      return true;
    }
    
    // For authenticated users, check if they have already posted in this time frame today
    // Only count posts made as authenticated user (guest: false)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data: existingPosts } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', session?.user.id)
      .eq('guest', false) // Only count authenticated posts
      .eq('franja', franja)
      .gte('fecha', `${today}T00:00:00`)
      .lte('fecha', `${today}T23:59:59`);
    
    if (existingPosts && existingPosts.length > 0) {
      setError(`Ya has publicado un susurro ${franja === 'DIA' ? 'diurno' : 'nocturno'} hoy.`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Por favor escribe un mensaje.');
      return;
    }
    
    if (message.length > 300) {
      setError('El mensaje no puede exceder los 300 caracteres.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const franja: 'DIA' | 'NOCHE' = isDay ? 'DIA' : 'NOCHE';
      
      // Check if user can post
      const canPost = await canUserPost(franja);
      if (!canPost) {
        setIsSubmitting(false);
        return;
      }
      
      // Get client IP with better error handling and multiple fallbacks
      let ip = '0.0.0.0'; // Default fallback value
      try {
        // Primary method - use ipify API
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData && ipData.ip) {
            ip = ipData.ip;
          }
        }
        
        // If primary method fails, try backup service
        if (ip === '0.0.0.0') {
          const backupResponse = await fetch('https://api.ip.sb/ip');
          if (backupResponse.ok) {
            const backupIp = await backupResponse.text();
            if (backupIp && backupIp.trim()) {
              ip = backupIp.trim();
            }
          }
        }
      } catch (ipErr) {
        console.error('Error fetching IP:', ipErr);
        // Continue with default IP
      }
      
      if (session?.user.id) {
        const currentDate = new Date().toISOString();

        const localEntry: EntryWithUser = {
          id: `temp-${Date.now()}`,
          user_id: session.user.id,
          nombre: session.user.name || '',
          mensaje: message,
          fecha: currentDate,
          ip,
          franja,
          guest: false,
          display_id: session.user.alias || 'BSY000',
          display_name: session.user.name || `Usuario ${session.user.alias || session.user.id}`,
          likes_count: 0,
          user_has_liked: false,
          has_objectives: franja === 'DIA',
          is_private: isPrivate
        };

        addLocalPost(localEntry);

        const objectiveTexts = objectives
          .map(obj => obj.text.trim())
          .filter(t => t.length > 0);

        const res = await fetch('/api/posts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensaje: message,
            franja,
            is_private: isPrivate,
            objectives: objectiveTexts,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al guardar el susurro');
        }

        if (objectiveTexts.length > 0) {
          setTimeout(() => refreshPosts(), 800);
        }
      } else {
        // Guest user
        const guestName = sessionStorage.getItem('guestName') || 'Guest';
        const currentDate = new Date().toISOString();
        
        // Create local entry to display immediately
        const localEntry: EntryWithUser = {
          id: `temp-${Date.now()}`, // Temporary ID until we get the real one
          user_id: null,
          nombre: guestName,
          mensaje: message,
          fecha: currentDate,
          ip,
          franja,
          guest: true,
          display_id: `${guestName} (Invitado)`,
          display_name: guestName,
          likes_count: 0,
          user_has_liked: false,
          has_objectives: franja === 'DIA',
          is_private: false
        };
        
        // Add to local feed immediately
        addLocalPost(localEntry);
        
        // Now save to Supabase
        const { data, error } = await supabase.from('entries').insert({
          user_id: null,
          nombre: guestName,
          mensaje: message,
          fecha: currentDate,
          ip,
          franja,
          guest: true,
          is_private: false // Los posts de invitados siempre son públicos
        }).select();
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data && data[0]) {
          sessionStorage.setItem('guestHasPosted', 'true');
        }
      }
      
      // Show success toast
      setShowToast(true);
      setToastMessage(objectives.length > 0 
        ? 'Susurro guardado con objetivos. Aparecerá en breve.' 
        : 'Susurro guardado correctamente');
      setTimeout(() => setShowToast(false), 3000); // Mostrar por más tiempo (3 segundos)
      
      // Clear form
      setMessage('');
      setObjectives([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el susurro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };
  
  // Función para añadir un nuevo objetivo
  const handleAddObjective = () => {
    // Limitar a 15 objetivos máximo
    if (objectives.length >= 15) {
      setError('Máximo 15 objetivos permitidos');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setObjectives([
      ...objectives,
      {
        id: `obj-${Date.now()}`,
        text: ''
      }
    ]);
  };
  
  // Función para actualizar el texto de un objetivo
  const handleObjectiveTextChange = (id: string, text: string) => {
    setObjectives(
      objectives.map(obj => 
        obj.id === id ? { ...obj, text } : obj
      )
    );
  };
  
  // Función para eliminar un objetivo
  const handleRemoveObjective = (id: string) => {
    setObjectives(objectives.filter(obj => obj.id !== id));
  };

  return (
    <div 
      className={`w-full max-w-[600px] mx-auto px-4 py-4 font-montserrat mobile-form-container ${
        keyboardVisible ? 'keyboard-active' : ''
      }`}
      style={{
        minHeight: keyboardVisible && viewportHeight > 0 ? `${viewportHeight}px` : undefined
      }}
    >
      {/* Toast notification */}
      {showToast && (
        <div
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          className="fixed left-1/2 transform -translate-x-1/2 bg-[#4A2E1B] text-[#F5F0E1] px-6 py-3 rounded-lg shadow-lg opacity-90 z-50"
        >
          {toastMessage}
        </div>
      )}
      
      {/* Form */}
      <div className={`rounded-lg shadow-md p-6 ${isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'} transition-all duration-300`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {isDay ? 'Establece tus objetivos diarios' : 'Reflexiona y agradece'}
          </h2>
          <div className="text-sm opacity-80">
            {getCurrentTime()}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Help text moved above textarea */}
          <p className="text-sm opacity-70 mb-2">Escribe tu whisper aquí</p>
          
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextChange}
              placeholder={isDay ? 'Revisa tus objetivos' : 'Reflexiona y agradece'}
              className={`w-full p-4 rounded-lg border-2 focus:outline-none focus:ring-2 resize-none transition-all duration-300 min-h-[160px] ${
                isDay 
                  ? 'bg-white border-[#4A2E1B] focus:ring-[#4A2E1B]/30' 
                  : 'bg-[#3A2723] border-[#F5F0E1] focus:ring-[#F5F0E1]/30'
              } ${
                keyboardVisible ? 'max-h-[120px]' : 'max-h-[200px]'
              }`}
              maxLength={300}
              style={{
                fontSize: '16px', // Prevent zoom on iOS
                WebkitAppearance: 'none',
                borderRadius: '12px'
              }}
            />
            
            {/* Character counter */}
            <div className="text-right mt-1 text-sm opacity-80">
              {message.length}/300
            </div>
          </div>
          
          {/* Objetivos */}
          {objectives.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Objetivos:</p>
              <div className="space-y-2">
                {objectives.map(objective => (
                  <div 
                    key={objective.id} 
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'
                    }`}
                  >
                    <input
                      type="text"
                      value={objective.text}
                      onChange={(e) => handleObjectiveTextChange(objective.id, e.target.value)}
                      placeholder="Escribe tu objetivo aquí"
                      className={`flex-grow p-2 rounded-md ${
                        isDay 
                          ? 'bg-white border-[#4A2E1B]/20 focus:border-[#4A2E1B]' 
                          : 'bg-[#3A2723] border-[#F5F0E1]/20 focus:border-[#F5F0E1]'
                      } border focus:outline-none`}
                    />
                    <button 
                      type="button"
                      onClick={() => handleRemoveObjective(objective.id)}
                      className="p-2 rounded-full hover:bg-red-100 text-red-500"
                      aria-label="Eliminar objetivo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Opción de post privado - solo visible para usuarios registrados */}
          {session?.user && (
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="isPrivate"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isPrivate" className="text-sm cursor-pointer flex items-center gap-1">
                Este susurro es solo para mí
                {isPrivate ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2z"/>
                  </svg>
                )}
              </label>
            </div>
          )}
          
          {/* Botones de acción */}
          <div className="flex flex-col gap-3">
            {/* Botón de añadir objetivo - solo visible en franja DIA */}
            {isDay && (
              <button
                type="button"
                onClick={handleAddObjective}
                className={`py-3 px-6 font-medium rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  isDay 
                    ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20' 
                    : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20'
                }`}
                aria-label="Añadir objetivo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Añadir objetivo
              </button>
            )}
            
            {/* Botón de susurrar */}
            <button
              type="submit"
              disabled={isSubmitting || message.trim().length === 0 || message.length > 300}
              className={`w-full py-4 px-6 font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                message.trim().length === 0 || message.length > 300
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:shadow-md active:scale-[0.98]'
              } ${
                isDay 
                  ? 'bg-[#4A2E1B] text-[#F5F0E1]' 
                  : 'bg-[#F5F0E1] text-[#2D1E1A]'
              }`}
              aria-label="Guardar susurro"
            >
              {isSubmitting ? 'Guardando...' : (
                <>
                  Susurrar
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 