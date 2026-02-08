'use client';

import { useState } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useTheme } from '@/context/ThemeContext';
import { logger } from '@/lib/logger';

function GuestForm() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { colors } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNavigating) {
      return; // Prevent multiple submissions
    }

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (!executeRecaptcha) {
      setError('reCAPTCHA no disponible');
      return;
    }

    setIsNavigating(true);

    try {
      await executeRecaptcha('guest_mode');
      
      // Store guest name in session storage
      try {
        sessionStorage.setItem('guestName', name);
        sessionStorage.setItem('isGuest', 'true');
        
        // Usar window.location en lugar de router.push
        // Este cambio es el único necesario para solucionar el error
        window.location.href = '/';
      } catch (storageErr) {
        logger.error('Error saving to sessionStorage', { error: String(storageErr) });
        // Fall back to direct navigation if sessionStorage fails
        window.location.href = '/';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      setIsNavigating(false);
    }
  };

  return (
    <div className="w-full max-w-md shadow-lg hover-lift transition-all duration-300" 
         style={{ 
           borderRadius: '8px', 
           backgroundColor: colors.formBg,
           overflow: 'hidden'
         }}>
      <div style={{ backgroundColor: colors.primary, color: colors.secondary }} className="py-4 px-6">
        <h2 className="text-xl font-bold font-montserrat text-center">
          Modo Invitado
        </h2>
      </div>
      
      <div className="p-8">
        <p className="mb-6 text-center" style={{ color: colors.text }}>
          Puedes publicar un susurro sin crear una cuenta.
          <br />
          <span className="text-sm" style={{ color: `${colors.text}99` }}>Límite: 1 susurro por sesión</span>
        </p>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              Tu Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border focus:outline-none focus:ring-2 transition-colors duration-300"
              style={{ 
                backgroundColor: colors.inputBg, 
                borderColor: colors.inputBorder, 
                borderRadius: '6px',
                color: colors.text
              }}
              required
              disabled={isNavigating}
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 font-medium transition-all duration-300 hover:shadow-md"
            style={{ 
              backgroundColor: colors.primary, 
              color: colors.secondary, 
              borderRadius: '6px',
              transform: 'translateY(0)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.buttonHover;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = colors.buttonHover;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            disabled={isNavigating}
          >
            {isNavigating ? 'Procesando...' : 'Continuar como Invitado'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/login'}
            className="text-sm hover:underline transition-colors duration-300"
            style={{ color: colors.text }}
            disabled={isNavigating}
          >
            Volver a Inicio de Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuestPage() {
  const { isDay, colors } = useTheme();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500" 
         style={{ backgroundColor: colors.background }}>
      <div className="mb-2 flex flex-col items-center justify-center gap-3">
        {/* Speech bubble with logo-bw */}
        <div className="relative">
          <div className={`rounded-full border-4 border-white p-4 transition-all duration-300 ${
            isDay 
              ? 'bg-[#F5F0E1] shadow-[0_4px_12px_rgba(74,46,27,0.15)]' 
              : 'bg-[#2D1E1A] shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
          }`}>
            <img
              src="/logo-bw.svg"
              alt="BESHY"
              width={120}
              height={120}
              className="h-16 w-auto relative z-10"
              style={{
                filter: isDay 
                  ? 'brightness(0) saturate(100%) invert(24%) sepia(24%) saturate(1234%) hue-rotate(8deg) brightness(95%) contrast(90%)' // Color #4A2E1B para día
                  : 'brightness(0) saturate(100%) invert(93%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)' // Color #F5F0E1 para noche
              }}
            />
          </div>
          {/* Three oval bubbles moved up 4px to look more like speech bubble */}
          <div className={`absolute top-full left-[5%] -translate-x-1/2 -mt-3.5 w-3 h-2 rounded-full border-2 border-white transition-all duration-300 ${
            isDay 
              ? 'bg-[#F5F0E1]' 
              : 'bg-[#2D1E1A]'
          }`}></div>
          <div className={`absolute top-full left-[-10%] -translate-x-1/2 -mt-2 w-2.5 h-1.5 rounded-full border-2 border-white transition-all duration-300 ${
            isDay 
              ? 'bg-[#F5F0E1]' 
              : 'bg-[#2D1E1A]'
          }`}></div>
          <div className={`absolute top-full left-[-20%] -translate-x-1/2 -mt-0.5 w-2 h-1 rounded-full border-2 border-white transition-all duration-300 ${
            isDay 
              ? 'bg-[#F5F0E1]' 
              : 'bg-[#2D1E1A]'
          }`}></div>
        </div>
        
        {/* Whisper logo outside */}
        <div>
          <img
            src="/Whisper.svg"
            alt="Whisper"
            width={300}
            height={80}
            className="h-12 w-auto"
            style={{
              filter: isDay 
                ? 'brightness(0) saturate(100%) invert(24%) sepia(24%) saturate(1234%) hue-rotate(8deg) brightness(95%) contrast(90%)' // Color #4A2E1B para día
                : 'brightness(0) saturate(100%) invert(93%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)' // Color #F5F0E1 para noche
            }}
          />
        </div>
      </div>
      <p className="mb-10 text-lg transition-colors duration-300" 
         style={{ color: colors.text }}>
        Susurra tu progreso en silencio.
      </p>
      
      <GoogleReCaptchaProvider
        reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
        scriptProps={{
          async: true,
          defer: true,
          appendTo: 'head',
        }}
      >
        <GuestForm />
      </GoogleReCaptchaProvider>
      
      <div className="mt-8 text-xs max-w-md text-center transition-colors duration-300" 
           style={{ color: `${colors.text}BF` }}>
        Usamos datos anónimos para hábitos, no compartimos con terceros.
      </div>
    </div>
  );
} 