'use client';

import { useState, useEffect } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useRouter } from 'next/navigation';
import WhisperForm from '@/components/WhisperForm';
import DailyQuote from '@/components/DailyQuote';
import Link from 'next/link';
import Image from 'next/image';
import { useDailyPostStatus } from '@/hooks/useDailyPostStatus';

// Custom hook for time of day
const useTimeOfDay = () => {
  const [isDay, setIsDay] = useState(true);
  
  useEffect(() => {
    const checkTimeOfDay = () => {
      const now = new Date();
      const hour = now.getHours();
      setIsDay(hour >= 6 && hour < 18);
    };
    
    checkTimeOfDay();
    const interval = setInterval(checkTimeOfDay, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return isDay;
};

export default function CreatePage() {
  const { session, status } = useAuthSession();
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const isDay = useTimeOfDay();
  const { hasDayPost, hasNightPost, contextualMissingCount, loading: statusLoading } = useDailyPostStatus();
  
  useEffect(() => {
    const guestMode = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(guestMode);
    
    // Clear guest posting state when user is authenticated
    if (session?.user?.id && guestMode) {
      sessionStorage.removeItem('isGuest');
      sessionStorage.removeItem('guestHasPosted');
      sessionStorage.removeItem('guestName');
      setIsGuest(false);
    }
  }, [session]);

  // Redirect to login if not authenticated and not guest
  useEffect(() => {
    if (status === 'loading') return;
    
    // Only redirect if we're sure the user is not a guest
    const currentGuestMode = sessionStorage.getItem('isGuest') === 'true';
    if (!session && !currentGuestMode) {
      router.push('/login');
    }
  }, [session, status, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className={`w-full max-w-[600px] mx-auto px-4 py-8 text-center font-montserrat ${
        isDay ? 'text-[#4A2E1B] bg-[#F5F0E1]' : 'text-[#F5F0E1] bg-[#2D1E1A]'
      } min-h-screen`}>
        <div className="animate-pulse flex justify-center">
          <div className={`h-6 w-24 ${isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'} rounded-md`}></div>
        </div>
        <p className="mt-2 opacity-80">Cargando...</p>
      </div>
    );
  }

  // Don't render if not authenticated and not guest
  const currentGuestMode = sessionStorage.getItem('isGuest') === 'true';
  if (!session && !currentGuestMode) {
    return null;
  }
  
  return (
    <main className={`min-h-screen transition-all duration-300 ${
      isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
    }`}>
      <div className="max-w-[600px] mx-auto px-4 py-8 sm:max-w-[600px]">
        {/* Header */}
        <header className="flex flex-col items-center mb-8">
          <div className="mb-2 flex flex-col items-center justify-center gap-3">
            {/* Speech bubble with logo-bw */}
            <div className="relative">
              <div className={`rounded-full border-4 border-white p-4 transition-all duration-300 ${
                isDay 
                  ? 'bg-[#F5F0E1] shadow-[0_4px_12px_rgba(74,46,27,0.15)]' 
                  : 'bg-[#2D1E1A] shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
              }`}>
                <Image
                  src="/w.svg"
                  alt="Crear Whisper"
                  width={120}
                  height={120}
                  className="h-16 w-auto relative z-10"
                  style={{
                    filter: isDay 
                      ? 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)'
                      : 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
                  }}
                />
              </div>
              {/* Three oval bubbles */}
              <div className={`absolute top-full left-[5%] -translate-x-1/2 -mt-3.5 w-3 h-2 rounded-full border-2 border-white transition-all duration-300 ${
                isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
              }`}></div>
              <div className={`absolute top-full left-[-10%] -translate-x-1/2 -mt-2 w-2.5 h-1.5 rounded-full border-2 border-white transition-all duration-300 ${
                isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
              }`}></div>
              <div className={`absolute top-full left-[-20%] -translate-x-1/2 -mt-0.5 w-2 h-1 rounded-full border-2 border-white transition-all duration-300 ${
                isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]'
              }`}></div>
            </div>
            
            {/* Create title */}
            <div>
              <h1 className="text-3xl font-bold text-center">
                Crear Whisper
              </h1>
            </div>
          </div>
          <p className="text-lg mb-6">
            Susurra tu progreso en silencio
          </p>
          
          {/* Navigation links */}
          <div className="flex items-center justify-between w-full">
            {session ? (
              <div className="flex items-center justify-between w-full">
                <Link href="/profile" className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                  isDay 
                    ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] shadow-[0_2px_8px_rgba(74,46,27,0.2)]' 
                    : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                } hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0">
                    <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                  </svg>
                  <span className="font-medium">Mi perfil</span>
                </Link>
                
                <Link href="/feed" className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                  isDay 
                    ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] shadow-[0_2px_8px_rgba(74,46,27,0.2)]' 
                    : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                } hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0">
                    <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
                    <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
                  </svg>
                  <span className="font-medium">Ver Posts</span>
                </Link>
              </div>
            ) : isGuest ? (
              <div className="flex items-center justify-between w-full">
                <div className="font-bold flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-current">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0">
                    <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                  </svg>
                  {sessionStorage.getItem('guestName') || 'Invitado'} <span className="font-normal opacity-70">(Invitado)</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/feed" className="text-sm hover:opacity-80 transition-opacity">
                    Ver Posts
                  </Link>
                  <span className="text-sm opacity-50">|</span>
                  <Link href="/login" className="text-sm hover:opacity-80 transition-opacity">
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </header>
        
        {/* Inspirational Message Section */}
        <div className={`mb-8 p-6 rounded-xl shadow-lg transition-all duration-300 ${
          isDay 
            ? 'bg-white/80 border border-[#4A2E1B]/10' 
            : 'bg-[#2D1E1A]/80 border border-[#F5F0E1]/10'
        }`}>
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Image
                src="/Whisper.svg"
                alt="Whisper"
                width={32}
                height={32}
                className="h-6 w-auto"
                style={{
                  filter: isDay 
                    ? 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)'
                    : 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
                }}
              />
              <span className="text-lg font-semibold">2 Whispers al día</span>
              <Image
                src="/Whisper.svg"
                alt="Whisper"
                width={32}
                height={32}
                className="h-6 w-auto"
                style={{
                  filter: isDay 
                    ? 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)'
                    : 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
                }}
              />
            </div>
            <p className="text-base mb-4 leading-relaxed">
              <span className="font-medium">Para mantener tu vida, tus ideas y tus sueños en armonía.</span>
              <br />
              Dos momentos perfectos para reflexionar y crecer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Day Posts */}
            <div className={`p-4 rounded-lg transition-all duration-300 ${
              isDay 
                ? 'bg-[#F5F0E1] border-l-4 border-[#FFD700]' 
                : 'bg-[#3A2B26] border-l-4 border-[#FFD700]'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#FFD700" viewBox="0 0 16 16">
                  <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                </svg>
                <h3 className="font-semibold text-sm">Whispers de Día</h3>
              </div>
              <ul className="text-xs space-y-1 opacity-80">
                <li>• <strong>Objetivos y metas</strong></li>
                <li>• <strong>Planes y proyectos</strong></li>
                <li>• <strong>Logros del día</strong></li>
                <li>• <strong>Momentos de gratitud</strong></li>
              </ul>
            </div>

            {/* Night Posts */}
            <div className={`p-4 rounded-lg transition-all duration-300 ${
              isDay 
                ? 'bg-[#F5F0E1] border-l-4 border-[#6B73FF]' 
                : 'bg-[#3A2B26] border-l-4 border-[#6B73FF]'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#6B73FF" viewBox="0 0 16 16">
                  <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                </svg>
                <h3 className="font-semibold text-sm">Whispers de Noche</h3>
              </div>
              <ul className="text-xs space-y-1 opacity-80">
                <li>• <strong>Reflexiones profundas</strong></li>
                <li>• <strong>Pensamientos íntimos</strong></li>
                <li>• <strong>Aprendizajes del día</strong></li>
                <li>• <strong>Sueños y aspiraciones</strong></li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-xs opacity-70">
              <span className="font-medium">¿Sabías que...</span> Los posts de día pueden incluir objetivos que puedes marcar como completados.
            </p>
          </div>
        </div>
        
        {/* Subtle Reminder for Missing Posts - Context Aware */}
        {session && !isGuest && !statusLoading && contextualMissingCount > 0 && (
          <div className={`mb-4 p-3 rounded-lg border-l-4 transition-all duration-300 ${
            isDay 
              ? 'bg-amber-50 border-amber-400 text-amber-800' 
              : 'bg-amber-900/20 border-amber-500 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {isDay ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                </svg>
              )}
              <div className="text-sm">
                {!hasDayPost && !hasNightPost ? (
                  <span>¡Aún no has compartido tus whispers de hoy! Comienza con tu reflexión {isDay ? 'matutina' : 'nocturna'}.</span>
                ) : isDay && !hasDayPost ? (
                  <span>Te falta tu whisper de día. ¿Qué objetivos o logros quieres compartir?</span>
                ) : !isDay && !hasNightPost ? (
                  <span>Te falta tu whisper de noche. ¿Qué reflexiones o aprendizajes tienes para hoy?</span>
                ) : isDay && !hasNightPost ? (
                  <span>¡Perfecto! Ya tienes tu whisper de día. Recuerda volver por la noche para tu reflexión nocturna.</span>
                ) : !isDay && !hasDayPost ? (
                  <span>¡Perfecto! Ya tienes tu whisper de noche. No olvides tu whisper matutino para mañana.</span>
                ) : null}
              </div>
            </div>
          </div>
        )}
        
        {/* Daily Quote */}
        <DailyQuote isDay={isDay} />

        {/* Whisper Creation Form */}
        <WhisperForm />
        
        {/* Footer */}
        <footer className="text-center mt-10 text-xs opacity-70">
          <p>Usamos datos anónimos para hábitos, no compartimos con terceros.</p>
        </footer>
      </div>
    </main>
  );
}