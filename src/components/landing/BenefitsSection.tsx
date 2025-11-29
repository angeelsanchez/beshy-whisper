import { ShieldCheck, Brain, Sparkles, Moon, Heart } from 'lucide-react';
import type { ElementType } from 'react';

interface Benefit {
  readonly title: string;
  readonly description: string;
  readonly Icon: ElementType;
  readonly gradient: string;
}

const benefits: readonly Benefit[] = [
  {
    title: 'Reduce el Estrés',
    description:
      'Escribir sobre tus experiencias ayuda a procesar emociones y reducir los niveles de ansiedad.',
    Icon: ShieldCheck,
    gradient: 'from-green-400 to-teal-500',
  },
  {
    title: 'Mejora la Claridad Mental',
    description:
      'Poner pensamientos en palabras organiza tu mente, mejora la memoria y facilita la toma de decisiones.',
    Icon: Brain,
    gradient: 'from-blue-400 to-purple-500',
  },
  {
    title: 'Estimula la Creatividad',
    description:
      'La escritura libre activa el pensamiento divergente y la resolución creativa de problemas.',
    Icon: Sparkles,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    title: 'Mejora el Descanso',
    description:
      'Escribir antes de dormir libera la mente de preocupaciones y facilita un sueño más reparador.',
    Icon: Moon,
    gradient: 'from-indigo-400 to-purple-500',
  },
  {
    title: 'Fortalece tu Bienestar Emocional',
    description:
      'La práctica regular de journaling desarrolla autoconocimiento e inteligencia emocional.',
    Icon: Heart,
    gradient: 'from-pink-400 to-rose-500',
  },
];

export default function BenefitsSection() {
  return (
    <section id="benefits" aria-labelledby="benefits-title" className="py-20 bg-app-bg text-app-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="benefits-title" className="text-4xl md:text-5xl font-bold mb-6">
            Beneficios del Journaling Diario
          </h2>
          <p className="text-xl opacity-80 max-w-3xl mx-auto">
            Respaldado por investigación en psicología positiva: escribir regularmente transforma tu mente
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="relative p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-app-form-bg border border-app-divider"
            >
              <div className="text-center">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${benefit.gradient} flex items-center justify-center mb-4 mx-auto shadow-lg`}
                >
                  <benefit.Icon className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm opacity-80">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-app-form-bg border border-app-divider">
            <p className="text-lg font-semibold mb-2">
              <span className="text-amber-500">Meta:</span> Solo 15-20 minutos diarios
            </p>
            <p className="opacity-80">
              Suficiente para notar beneficios reales en pocas semanas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
