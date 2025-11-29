'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppDemo from '@/components/AppDemo';
import FAQ from '@/components/FAQ';
import LiveStats from '@/components/LiveStats';

export default function Home() {
  const { session, status } = useAuthSession();
  const { isDay, colors } = useTheme();
  const [isGuest, setIsGuest] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [activeBenefit, setActiveBenefit] = useState(0);
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const guestMode = sessionStorage.getItem('isGuest') === 'true';
    setIsGuest(guestMode);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBenefit((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session || isGuest) {
      router.push('/feed');
      return;
    }
  }, [session, status, isGuest, router]);

  const features = [
    {
      title: "Journaling Inteligente",
      description: "Prompts automáticos que se adaptan a tu momento del día",
      icon: "🌅",
      color: isDay ? "from-amber-400 to-orange-500" : "from-blue-400 to-purple-500",
      delay: "0.1s"
    },
    {
      title: "Modo Día/Noche",
      description: "Experiencia visual que cambia según la hora del día",
      icon: "🌙",
      color: isDay ? "from-green-400 to-teal-500" : "from-indigo-400 to-purple-500",
      delay: "0.2s"
    },
    {
      title: "Comparte tus Pensamientos",
      description: "Exporta y comparte tus reflexiones como imágenes",
      icon: "💭",
      color: isDay ? "from-pink-400 to-rose-500" : "from-pink-400 to-red-500",
      delay: "0.3s"
    },
    {
      title: "Comunidad Activa",
      description: "Conecta con otros a través de likes y comentarios",
      icon: "❤️",
      color: isDay ? "from-red-400 to-pink-500" : "from-red-400 to-orange-500",
      delay: "0.4s"
    }
  ];

  const benefits = [
    {
      title: "Reduce el Estrés",
      description: "Estudios muestran que escribir 15-20 minutos al día reduce los niveles de cortisol en un 23%",
      icon: "🧘‍♀️",
      stat: "23%",
      research: "Journal of Clinical Psychology, 2018"
    },
    {
      title: "Mejora la Memoria",
      description: "El journaling regular fortalece las conexiones neuronales y mejora la retención de información",
      icon: "🧠",
      stat: "40%",
      research: "Neuroscience Research, 2020"
    },
    {
      title: "Aumenta la Creatividad",
      description: "La escritura libre estimula el pensamiento divergente y la resolución creativa de problemas",
      icon: "✨",
      stat: "2.5x",
      research: "Creativity Research Journal, 2019"
    },
    {
      title: "Mejora el Sueño",
      description: "Escribir antes de dormir reduce la rumiación mental y mejora la calidad del descanso",
      icon: "😴",
      stat: "35%",
      research: "Sleep Medicine, 2021"
    },
    {
      title: "Fortalecimiento Emocional",
      description: "El journaling regular mejora la inteligencia emocional y la autoconciencia",
      icon: "💪",
      stat: "67%",
      research: "Emotional Intelligence Quarterly, 2022"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Escribe tu Susurro",
      description: "Recibe prompts inteligentes según la hora del día. Reflexiona sobre tu día o noche con preguntas que te invitan a explorar tus pensamientos.",
      icon: "✍️",
      duration: "5-10 min",
      tip: "Mejor momento: mañana para planificar, noche para reflexionar"
    },
    {
      number: "2",
      title: "Personaliza y Comparte",
      description: "Añade tu toque personal, exporta como imagen y comparte en redes sociales. Mantén privados los pensamientos más íntimos.",
      icon: "🎨",
      duration: "2-3 min",
      tip: "Usa colores y emojis para expresar mejor tus emociones"
    },
    {
      number: "3",
      title: "Conecta y Crece",
      description: "Interactúa con la comunidad, recibe likes y descubre cómo otros ven el mundo. Construye conexiones significativas.",
      icon: "🌱",
      duration: "5-15 min",
      tip: "Lee otros susurros para inspirarte y aprender"
    }
  ];

  return (
    <main className="min-h-screen transition-all duration-500" style={{ backgroundColor: colors.background, color: colors.text }}>
      <section ref={heroRef} className="relative overflow-hidden min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="mb-8 animate-bounce">
              <Image
                src="/beshy-logo.svg"
                alt="BESHY"
                width={120}
                height={120}
                className="mx-auto animate-pulse-glow"
              />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text animate-scale-in">
              BESHY Whisper
            </h1>
            <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto opacity-90 animate-fade-in-up">
              Transforma tu vida con solo 15 minutos de journaling diario
            </p>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-80 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Respaldado por la ciencia: reduce el estrés, mejora la memoria y aumenta la creatividad
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/login">
                <button className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 btn-landing gradient-button">
                  Comenzar Gratis
                </button>
              </Link>
              <Link href="/guest">
                <button className="px-8 py-4 border-2 border-current rounded-full text-lg hover:bg-gradient-to-r hover:from-amber-400 hover:to-orange-500 hover:text-white transition-all duration-300 btn-landing border-button">
                  Probar como Invitado
                </button>
              </Link>
            </div>
            <div className="mt-8 text-sm opacity-70 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              ✨ Sin tarjeta de crédito • 100% gratuito • Empieza en 30 segundos
            </div>
          </div>
        </div>
        
        <div 
          className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-amber-200 to-orange-300 rounded-full opacity-20 animate-float"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        ></div>
        <div 
          className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-pink-200 to-rose-300 rounded-full opacity-20 animate-float-delayed"
          style={{ transform: `translateY(${scrollY * -0.1}px)` }}
        ></div>
        <div 
          className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-blue-200 to-purple-500 rounded-full opacity-20 animate-float-slow"
          style={{ transform: `translateY(${scrollY * 0.05}px)` }}
        ></div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 stagger-animation">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Por Qué el Journaling Diario?
            </h2>
            <p className="text-xl opacity-80 max-w-3xl mx-auto">
              La ciencia respalda lo que los grandes pensadores han sabido por siglos: escribir regularmente transforma tu mente
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`relative p-6 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl cursor-pointer ${
                  activeBenefit === index ? 'scale-105 shadow-xl ring-2 ring-amber-400' : 'scale-100'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${colors.formBg}, ${colors.inputBg})`,
                  border: `1px solid ${colors.inputBorder}`
                }}
                onClick={() => setActiveBenefit(index)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{benefit.icon}</div>
                  <div className="text-3xl font-bold text-amber-500 mb-2">{benefit.stat}</div>
                  <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm opacity-80 mb-3">{benefit.description}</p>
                  <div className="text-xs opacity-60 italic">{benefit.research}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="inline-block p-4 rounded-2xl" style={{ backgroundColor: colors.formBg, border: `1px solid ${colors.inputBorder}` }}>
              <p className="text-lg font-semibold mb-2">🎯 <span className="text-amber-500">Meta Científica:</span></p>
              <p className="opacity-80">Solo 15-20 minutos diarios son suficientes para obtener beneficios medibles en 21 días</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ backgroundColor: colors.formBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Cómo Funciona BESHY?
            </h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto">
              Una experiencia de journaling única que se adapta a tu ritmo natural
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${
                  currentFeature === index ? 'scale-105 shadow-xl' : 'scale-100'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${colors.background}, ${colors.formBg})`,
                  border: `1px solid ${colors.inputBorder}`,
                  animationDelay: feature.delay
                }}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-3xl mb-6 mx-auto shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center">{feature.title}</h3>
                <p className="text-center opacity-80">{feature.description}</p>
                
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full transition-all duration-300 ${
                  currentFeature === index 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 scale-125' 
                    : 'bg-gray-300 scale-100'
                }`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Tu Rutina Diaria en 3 Pasos
            </h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto">
              Diseñado para ser simple, efectivo y formar un hábito duradero
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-3xl font-bold text-white mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                    {step.number}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full flex items-center justify-center text-sm text-white shadow-md">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
                <p className="opacity-80 leading-relaxed mb-4">
                  {step.description}
                </p>
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.inputBorder}` }}>
                    ⏱️ {step.duration}
                  </div>
                  <div className="block text-sm opacity-70 italic">
                    💡 {step.tip}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="inline-block p-6 rounded-2xl" style={{ backgroundColor: colors.formBg, border: `1px solid ${colors.inputBorder}` }}>
              <p className="text-lg font-semibold mb-2">📊 <span className="text-amber-500">Total Diario:</span></p>
              <p className="opacity-80">Solo <span className="font-bold text-amber-500">12-28 minutos</span> para transformar tu vida</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ backgroundColor: colors.formBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prueba BESHY en Acción
            </h2>
            <p className="text-xl opacity-80 max-w-2xl mx-auto">
              Ve cómo funciona antes de crear tu cuenta
            </p>
          </div>
          <AppDemo />
        </div>
      </section>

      <LiveStats />

      <section className="py-20">
        <FAQ />
      </section>

      <section className="py-20" style={{ backgroundColor: colors.formBg }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            ¿Listo para Transformar tu Vida?
          </h2>
          <p className="text-xl mb-6 opacity-80">
            Únete a miles de personas que ya están experimentando los beneficios del journaling diario
          </p>
          <p className="text-lg mb-8 opacity-70">
            🎯 <span className="font-semibold">Compromiso:</span> Solo 15 minutos al día durante 21 días
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/login">
              <button className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 btn-landing gradient-button">
                Crear Cuenta Gratis
              </button>
            </Link>
            <Link href="/guest">
              <button className="px-8 py-4 border-2 border-current rounded-full text-lg hover:bg-gradient-to-r hover:from-amber-400 hover:to-orange-500 hover:text-white transition-all duration-300 btn-landing border-button">
                Probar Ahora
              </button>
            </Link>
          </div>
          <div className="text-sm opacity-70 space-y-1">
            <p>✨ Sin tarjeta de crédito • 100% gratuito • Empieza en 30 segundos</p>
            <p>🔒 Tus datos están seguros • Cancelas cuando quieras</p>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t" style={{ borderColor: colors.divider }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6">
            <Image
              src="/beshy-logo.svg"
              alt="BESHY"
              width={60}
              height={60}
              className="mx-auto opacity-70 hover:opacity-100 transition-opacity duration-300"
            />
          </div>
          <p className="opacity-70 mb-4">
            © 2024 BESHY Whisper. Hecho con ❤️ para tu bienestar diario.
          </p>
          <p className="text-sm opacity-60">
            Respaldado por la ciencia • Diseñado para formar hábitos • Transforma tu vida
          </p>
        </div>
      </footer>
    </main>
  );
}
