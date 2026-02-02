'use client';

import { useState, useEffect } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import Feed from '@/components/Feed';
import PullToRefresh from '@/components/PullToRefresh';
import Link from 'next/link';
import Image from 'next/image';

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

export default function FeedPage() {
  const { session, status } = useAuthSession();
  const [isGuest, setIsGuest] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isDay = useTimeOfDay();
  
  useEffect(() => {
    const guestMode = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(guestMode);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    // Force a re-render of the Feed component by updating the key
    setRefreshKey(prev => prev + 1);
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear any caches if needed
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      } catch {
        // Cache clearing is best-effort
      }
    }
  };
  
  return (
    <main className={`min-h-screen transition-all duration-300 ${
      isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'
    }`}>
      <PullToRefresh onRefresh={handleRefresh} isDay={isDay}>
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
                    src="/logo-bw.svg"
                    alt="BESHY"
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
              
              {/* Whisper logo */}
              <div>
                <Image
                  src="/Whisper.svg"
                  alt="Whisper"
                  width={300}
                  height={80}
                  className="h-12 w-auto"
                  style={{
                    filter: isDay 
                      ? 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)'
                      : 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
                  }}
                />
              </div>
            </div>
            <p className="text-lg mb-6">
              Explora los susurros de la comunidad
            </p>
            
            {/* User info / Actions */}
            <div className="flex items-center justify-between w-full">
              {status === 'loading' ? (
                <div className="animate-pulse flex justify-center">
                  <div className="h-5 w-20 bg-neutral-400 rounded"></div>
                </div>
              ) : session ? (
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
                  
                  <Link href="/create" className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${
                    isDay 
                      ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] shadow-[0_2px_8px_rgba(74,46,27,0.2)]' 
                      : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1] shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                  } hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}>
                    <Image
                      src="/w.svg"
                      alt="Crear post"
                      width={16}
                      height={16}
                      style={{
                        filter: isDay 
                          ? 'brightness(0) saturate(100%) invert(96%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
                          : 'brightness(0) saturate(100%) invert(29%) sepia(17%) saturate(1290%) hue-rotate(359deg) brightness(96%) contrast(86%)'
                      }}
                    />
                    <span className="font-medium">Crear</span>
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
                  <Link href="/login" className="text-sm hover:opacity-80 transition-opacity">
                    Iniciar sesión
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="font-bold flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-current">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0">
                      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                    </svg>
                    Invitado <span className="font-normal opacity-70">(Sin sesión)</span>
                  </div>
                  <Link href="/login" className="text-sm hover:opacity-80 transition-opacity">
                    Iniciar sesión
                  </Link>
                </div>
              )}
            </div>
          </header>
          
          {/* Feed Component */}
          <Feed key={refreshKey} />
        </div>
      </PullToRefresh>
    </main>
  );
}