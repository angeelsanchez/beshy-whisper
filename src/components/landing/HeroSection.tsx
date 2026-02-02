import Image from 'next/image';
import Link from 'next/link';
import FloatingOrbs from './FloatingOrbs';

export default function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative overflow-hidden min-h-screen flex items-center bg-app-bg text-app-text"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
        <div className="text-center">
          <div className="mb-8 animate-bounce">
            <Image
              src="/beshy-logo.svg"
              alt="Beshy Whisper"
              width={120}
              height={120}
              priority
              className="mx-auto animate-pulse-glow"
            />
          </div>

          <h1
            id="hero-title"
            className="text-5xl md:text-7xl font-bold mb-6 gradient-text animate-scale-in"
          >
            Beshy Whisper
          </h1>

          <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto opacity-90 animate-fade-in-up">
            Transforma tu vida con solo 15 minutos de journaling diario
          </p>

          <p
            className="text-lg mb-8 max-w-2xl mx-auto opacity-80 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            Escribe, reflexiona y conecta con una comunidad que valora el bienestar
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 btn-landing gradient-button text-center"
            >
              Comenzar Gratis
            </Link>
          </div>

          <p
            className="mt-4 text-sm opacity-70 animate-fade-in-up"
            style={{ animationDelay: '0.35s' }}
          >
            o{' '}
            <Link href="/guest" className="underline hover:opacity-100 transition-opacity">
              prueba como invitado
            </Link>
          </p>

          <div
            className="mt-6 text-sm opacity-60 animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            Sin tarjeta de crédito &middot; 100% gratuito &middot; Empieza en 30 segundos
          </div>
        </div>
      </div>

      <FloatingOrbs />
    </section>
  );
}
