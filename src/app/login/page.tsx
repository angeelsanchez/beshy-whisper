'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useTheme } from '@/context/ThemeContext';
import { passwordConfirmSchema } from '@/lib/schemas/password';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  useEffect(() => {
    setError('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [isRegistering]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownEnd) return;
    setMessage('');

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

        const passwordValidation = passwordConfirmSchema.safeParse({ password, confirmPassword });
        if (!passwordValidation.success) {
          const fieldErrors = passwordValidation.error.flatten().fieldErrors;
          const firstError = fieldErrors.password?.[0] ?? fieldErrors.confirmPassword?.[0] ?? 'Contrasena invalida';
          setError(firstError);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, token, name: displayName }),
        });

        const data: { message?: string; bsy_id?: string; errors?: Record<string, string[]> } = await res.json();

        if (!res.ok) {
          if (data.errors?.password?.length) {
            setError(data.errors.password[0]);
          } else {
            throw new Error(data.message ?? 'Error al registrarse');
          }
          return;
        }

        setMessage(`Registro exitoso. Tu identificador es ${data.bsy_id}. Por favor, inicia sesión.`);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
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

        globalThis.location.href = '/';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    await signIn('google', { callbackUrl: '/' });
  };

  const handleGuestMode = (): void => {
    globalThis.location.href = '/guest';
  };

  const activeTab = isRegistering ? 'register' : 'login';

  return (
    <div className="w-full max-w-md shadow-lg hover-lift transition-all duration-300"
         style={{
           borderRadius: '8px',
           backgroundColor: colors.formBg,
           overflow: 'hidden'
         }}>
      <div role="tablist" aria-label="Método de acceso" className="flex">
        <button
          role="tab"
          id="tab-login"
          aria-selected={activeTab === 'login'}
          aria-controls="panel-login"
          onClick={() => setIsRegistering(false)}
          className="flex-1 py-4 text-center font-montserrat font-medium transition-colors duration-300"
          style={{
            backgroundColor: activeTab === 'login' ? colors.tabActive : colors.tabInactive,
            color: activeTab === 'login' ? colors.secondary : colors.text
          }}
        >
          Entrar
        </button>
        <button
          role="tab"
          id="tab-register"
          aria-selected={activeTab === 'register'}
          aria-controls="panel-register"
          onClick={() => setIsRegistering(true)}
          className="flex-1 py-4 text-center font-montserrat font-medium transition-colors duration-300"
          style={{
            backgroundColor: activeTab === 'register' ? colors.tabActive : colors.tabInactive,
            color: activeTab === 'register' ? colors.secondary : colors.text
          }}
        >
          Registrar
        </button>
        <button
          role="tab"
          id="tab-guest"
          aria-selected={false}
          onClick={handleGuestMode}
          className="flex-1 py-4 text-center font-montserrat font-medium transition-colors duration-300"
          style={{ backgroundColor: colors.tabInactive, color: colors.text }}
        >
          Invitado
        </button>
      </div>

      <div
        role="tabpanel"
        id={activeTab === 'login' ? 'panel-login' : 'panel-register'}
        aria-labelledby={activeTab === 'login' ? 'tab-login' : 'tab-register'}
        className="p-8"
      >
        {error && (
          <div id="form-error" role="alert" className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mb-6 p-3 bg-green-100 text-green-700 rounded-md">
            {message}
          </div>
        )}

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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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
            <div className="w-full border-t" style={{ borderColor: colors.divider }} />
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              Email
            </label>
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
              placeholder="tu@email.com"
              required
              aria-required="true"
              aria-describedby={error ? 'form-error' : undefined}
              autoComplete="email"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
              Contrasena
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border focus:outline-none focus:ring-2 transition-colors duration-300"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  borderRadius: '6px',
                  color: colors.text
                }}
                placeholder={isRegistering ? 'Min. 8 caracteres' : 'Tu contraseña'}
                required
                aria-required="true"
                aria-describedby={error ? 'form-error' : undefined}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: colors.text }}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                  </svg>
                )}
              </button>
            </div>
            {isRegistering && <PasswordStrengthIndicator password={password} />}
          </div>

          {isRegistering && (
            <>
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border focus:outline-none focus:ring-2 transition-colors duration-300"
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      borderRadius: '6px',
                      color: colors.text
                    }}
                    placeholder="Repite tu contraseña"
                    required
                    aria-required="true"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: colors.text }}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Nombre (opcional)
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
                  placeholder="¿Cómo quieres que te llamemos?"
                  maxLength={50}
                  autoComplete="name"
                />
                <p className="text-xs mt-1" style={{ color: `${colors.text}80` }}>
                  {name.length}/50 caracteres
                </p>
              </div>
            </>
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
    <main className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500"
         style={{ backgroundColor: colors.background }}>
      <div className="mb-2 flex flex-col items-center justify-center gap-3">
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
                  ? 'brightness(0) saturate(100%) invert(24%) sepia(24%) saturate(1234%) hue-rotate(8deg) brightness(95%) contrast(90%)'
                  : 'brightness(0) saturate(100%) invert(93%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
              }}
            />
          </div>
          <div className={`absolute top-full left-[5%] -translate-x-1/2 -mt-3.5 w-3 h-2 rounded-full border-2 border-white transition-all duration-300 ${
            isDay
              ? 'bg-[#F5F0E1]'
              : 'bg-[#2D1E1A]'
          }`} />
          <div className={`absolute top-full left-[-10%] -translate-x-1/2 -mt-2 w-2.5 h-1.5 rounded-full border-2 border-white transition-all duration-300 ${
            isDay
              ? 'bg-[#F5F0E1]'
              : 'bg-[#2D1E1A]'
          }`} />
          <div className={`absolute top-full left-[-20%] -translate-x-1/2 -mt-0.5 w-2 h-1 rounded-full border-2 border-white transition-all duration-300 ${
            isDay
              ? 'bg-[#F5F0E1]'
              : 'bg-[#2D1E1A]'
          }`} />
        </div>

        <div>
          <img
            src="/Whisper.svg"
            alt="Whisper"
            width={300}
            height={80}
            className="h-12 w-auto"
            style={{
              filter: isDay
                ? 'brightness(0) saturate(100%) invert(24%) sepia(24%) saturate(1234%) hue-rotate(8deg) brightness(95%) contrast(90%)'
                : 'brightness(0) saturate(100%) invert(93%) sepia(8%) saturate(349%) hue-rotate(17deg) brightness(101%) contrast(94%)'
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
    </main>
  );
}
