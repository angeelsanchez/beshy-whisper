'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function AnimatedW() {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 152 140"
        className="w-24 h-24 md:w-32 md:h-32"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b">
              <animate
                attributeName="stop-color"
                values="#f59e0b;#ea580c;#f59e0b"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#ea580c">
              <animate
                attributeName="stop-color"
                values="#ea580c;#f59e0b;#ea580c"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform="translate(0,140) scale(0.1,-0.1)" fill="url(#wGradient)" filter="url(#glow)">
          <path d="M72 1088 c-19 -19 -14 -46 23 -122 33 -68 52 -135 108 -382 51 -223 114 -333 200 -349 80 -15 166 45 221 154 14 27 46 122 71 211 46 163 75 240 101 261 19 16 29 -14 43 -136 15 -130 43 -265 71 -338 39 -104 91 -144 176 -134 102 11 165 110 239 372 25 88 66 213 91 277 39 98 45 120 34 133 -28 33 -107 5 -145 -53 -33 -50 -84 -194 -125 -352 -48 -186 -78 -233 -119 -189 -28 30 -57 149 -86 352 -28 193 -44 247 -83 277 -40 32 -103 27 -147 -12 -54 -47 -126 -204 -185 -407 -28 -96 -60 -187 -71 -203 -39 -55 -101 -28 -128 55 -6 18 -29 124 -51 237 -57 286 -95 360 -184 360 -23 0 -47 -5 -54 -12z" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 to-orange-500/30 blur-3xl -z-10 animate-pulse" />
    </div>
  );
}

function TypewriterText({ text, delay = 0 }: { readonly text: string; readonly delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayText}
      {started && displayText.length < text.length && (
        <span className="inline-block w-0.5 h-6 md:h-8 bg-amber-500 animate-pulse ml-1 align-middle" />
      )}
    </span>
  );
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-amber-400/40 rounded-full"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative overflow-hidden min-h-screen flex items-center bg-app-bg text-app-text"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-orange-500/5" />

      <FloatingParticles />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
        <div className="text-center">
          <div
            className={`mb-8 flex justify-center transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
            }`}
          >
            <AnimatedW />
          </div>

          <h1
            id="hero-title"
            className={`text-5xl md:text-7xl lg:text-8xl font-bold mb-6 transition-all duration-1000 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Beshy Whisper
            </span>
          </h1>

          <p
            className={`text-xl md:text-2xl mb-6 max-w-3xl mx-auto transition-all duration-1000 delay-500 ${
              mounted ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {mounted && <TypewriterText text="Transforma tu vida con solo 15 minutos de journaling diario" delay={800} />}
          </p>

          <p
            className={`text-lg mb-10 max-w-2xl mx-auto transition-all duration-1000 delay-700 ${
              mounted ? 'opacity-70 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            Escribe, reflexiona y conecta con una comunidad que valora el bienestar
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <Link
              href="/login"
              className="group relative w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-2xl hover:shadow-amber-500/25 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">Comenzar Gratis</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>

            <Link
              href="/guest"
              className="w-full sm:w-auto px-10 py-4 border-2 border-amber-400/50 text-app-text font-semibold rounded-full text-lg hover:border-amber-400 hover:bg-amber-400/10 transform hover:scale-105 transition-all duration-300"
            >
              Probar como invitado
            </Link>
          </div>

          <div
            className={`mt-10 flex flex-wrap justify-center gap-6 text-sm transition-all duration-1000 ${
              mounted ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: '1200ms' }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              100% gratuito
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Empieza en 30 segundos
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
