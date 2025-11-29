import { Sunrise, MoonStar, MessageCircle, Users } from 'lucide-react';
import type { ElementType } from 'react';

interface Feature {
  readonly title: string;
  readonly description: string;
  readonly Icon: ElementType;
  readonly gradient: string;
}

const features: readonly Feature[] = [
  {
    title: 'Journaling Inteligente',
    description: 'Prompts automáticos que se adaptan a tu momento del día',
    Icon: Sunrise,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    title: 'Modo Día/Noche',
    description: 'Experiencia visual que cambia según la hora del día',
    Icon: MoonStar,
    gradient: 'from-indigo-400 to-purple-500',
  },
  {
    title: 'Comparte tus Pensamientos',
    description: 'Exporta y comparte tus reflexiones como imágenes personalizables',
    Icon: MessageCircle,
    gradient: 'from-pink-400 to-rose-500',
  },
  {
    title: 'Comunidad Activa',
    description: 'Conecta con otros a través de likes y follows',
    Icon: Users,
    gradient: 'from-green-400 to-teal-500',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="py-20 bg-app-form-bg text-app-text"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="features-title" className="text-4xl md:text-5xl font-bold mb-6">
            Cómo Funciona Beshy Whisper
          </h2>
          <p className="text-xl opacity-80 max-w-2xl mx-auto">
            Una experiencia de journaling única que se adapta a tu ritmo natural
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative p-8 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-app-bg border border-app-divider"
            >
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 mx-auto shadow-lg`}
              >
                <feature.Icon className="w-8 h-8 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">{feature.title}</h3>
              <p className="text-center opacity-80">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
