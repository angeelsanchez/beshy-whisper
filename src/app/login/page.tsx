'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useTheme } from '@/context/ThemeContext';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Credenciales incorrectas',
  SessionRequired: 'Sesión requerida',
  OAuthSignin: 'Error al iniciar sesión con Google',
  OAuthCallback: 'Error al iniciar sesión con Google',
  OAuthAccountNotLinked: 'Esta cuenta ya existe con otro método de inicio de sesión',
};

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { isDay, colors } = useTheme();

  useEffect(() => {
    if (!cooldownEnd) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        setCooldownEnd(null);
        setError('');
      } else {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        setError(`Demasiados intentos. Espera ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownEnd) return;

    if (!executeRecaptcha) {
      setError('reCAPTCHA no disponible');
      return;
    }

    try {
      const token = await executeRecaptcha('login_register');

      if (isRegistering) {
        const displayName = name.trim();
        if (displayName && displayName.length > 50) {
          setError('El nombre no puede exceder los 50 caracteres');
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, token, name: displayName }),
        });

        const data: { message?: string; bsy_id?: string } = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Error al registrarse');
        }

        setMessage(`Registro exitoso. Tu identificador es ${data.bsy_id}. Por favor, inicia sesión.`);
        setEmail('');
        setPassword('');
        setName('');
        setIsRegistering(false);
      } else {
        const lockoutRes = await fetch('/api/auth/check-lockout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (lockoutRes.ok) {
          const lockoutData: { locked: boolean; remainingSeconds: number } = await lockoutRes.json();
          if (lockoutData.locked) {
            setCooldownEnd(Date.now() + lockoutData.remainingSeconds * 1000);
            return;
          }
        }

        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          const friendlyMessage = AUTH_ERROR_MESSAGES[result.error] ?? 'Ha ocurrido un error al iniciar sesión';
          throw new Error(friendlyMessage);
        }

        window.location.href = '/';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
    }
  };

  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: '/' });
  };

  const handleGuestMode = () => {
    window.location.href = '/guest';
  };

  return (
    <div className="w-full max-w-md shadow-lg hover-lift transition-all duration-300" 
         style={{ 
           borderRadius: '8px', 
           backgroundColor: colors.formBg,
           overflow: 'hidden'
         }}>
      {/* Tabs para cambiar entre login y registro */}
      <div className="flex">
        <button
          onClick={() => setIsRegistering(false)}
          className="flex-1 py-4 text-center font-montserrat font-medium transition-colors duration-300"
          style={{ 
            backgroundColor: !isRegistering ? colors.tabActive : colors.tabInactive,
            color: !isRegistering ? colors.secondary : colors.text
          }}
        >
          Entrar
        </button>
        <button
          onClick={() => setIsRegistering(true)}
          className="flex-1 py-4 text-center font-montserrat font-medium transition-colors duration-300"
          style={{ 
            backgroundColor: isRegistering ? colors.tabActive : colors.tabInactive,
            color: isRegistering ? colors.secondary : colors.text
          }}
        >
          Registrar
        </button>
        <button
          onClick={handleGuestMode}
          className="flex-1 py-4 text-center font-montserrat font-medium transition-colors duration-300"
          style={{ backgroundColor: colors.tabInactive, color: colors.text }}
        >
          Invitado
        </button>
      </div>
      
      <div className="p-8">
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-md">
            {message}
          </div>
        )}
        
        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full mb-6 flex items-center justify-center gap-2 border hover:shadow-md transition-all duration-300"
          style={{ 
            borderRadius: '6px', 
            padding: '12px 16px',
            backgroundColor: isDay ? 'white' : '#382723',
            borderColor: isDay ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            color: isDay ? '#757575' : '#E0E0E0'
          }}
        >
          <div className="w-5 h-5 mr-2 relative flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <span className="font-medium">Continuar con Google</span>
        </button>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: colors.divider }}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3" style={{ 
              backgroundColor: colors.formBg, 
              color: `${colors.text}99` 
            }}>
              o
            </span>
          </div>
        </div>
        
        {/* Email/Password Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-3 border focus:outline-none focus:ring-2 transition-colors duration-300"
                style={{ 
                  backgroundColor: colors.inputBg, 
                  borderColor: colors.inputBorder, 
                  borderRadius: '6px',
                  color: colors.text
                }}
              placeholder="Email"
              required
            />
          </div>
          
          <div className="mb-4">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border focus:outline-none focus:ring-2 transition-colors duration-300"
              style={{ 
                backgroundColor: colors.inputBg, 
                borderColor: colors.inputBorder, 
                borderRadius: '6px',
                color: colors.text
              }}
              placeholder="Contraseña"
              required
            />
          </div>
          
          {isRegistering && (
            <div className="mb-6">
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
                placeholder="Nombre (opcional)"
                maxLength={50}
              />
              <p className="text-xs mt-1" style={{ color: `${colors.text}80` }}>
                {name.length}/50 caracteres
              </p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={cooldownEnd !== null}
            className={`w-full py-3 px-4 font-medium transition-all duration-300 ${
              cooldownEnd !== null ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
            }`}
            style={{
              backgroundColor: colors.primary,
              color: colors.secondary,
              borderRadius: '6px',
              transform: 'translateY(0)',
            }}
            onMouseOver={(e) => {
              if (cooldownEnd === null) {
                e.currentTarget.style.backgroundColor = colors.buttonHover;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onFocus={(e) => {
              if (cooldownEnd === null) {
                e.currentTarget.style.backgroundColor = colors.buttonHover;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isRegistering ? 'Registrar' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </GoogleReCaptchaProvider>
      
      <div className="mt-8 text-xs max-w-md text-center transition-colors duration-300" 
           style={{ color: `${colors.text}BF` }}>
        Usamos datos anónimos para hábitos, no compartimos con terceros.
      </div>
    </div>
  );
} 