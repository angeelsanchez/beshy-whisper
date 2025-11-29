import { PenLine, Palette, Sprout } from 'lucide-react';
import type { ElementType } from 'react';

interface Step {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly Icon: ElementType;
  readonly duration: string;
  readonly tip: string;
}

const steps: readonly Step[] = [
  {
    number: '1',
    title: 'Escribe tu Susurro',
    description:
      'Recibe prompts inteligentes según la hora del día. Reflexiona sobre tu día o noche con preguntas que te invitan a explorar tus pensamientos.',
    Icon: PenLine,
    duration: '5-10 min',
    tip: 'Mejor momento: mañana para planificar, noche para reflexionar',
  },
  {
    number: '2',
    title: 'Personaliza y Comparte',
    description:
      'Añade tu toque personal, exporta como imagen y comparte en redes sociales. Mantén privados los pensamientos más íntimos.',
    Icon: Palette,
    duration: '2-3 min',
    tip: 'Usa las plantillas para compartir en redes sociales',
  },
  {
    number: '3',
    title: 'Conecta y Crece',
    description:
      'Interactúa con la comunidad, recibe likes y descubre cómo otros ven el mundo. Construye conexiones significativas.',
    Icon: Sprout,
    duration: '5-15 min',
    tip: 'Lee otros susurros para inspirarte y aprender',
  },
];

export default function StepsSection() {
  return (
    <section id="steps" aria-labelledby="steps-title" className="py-20 bg-app-bg text-app-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="steps-title" className="text-4xl md:text-5xl font-bold mb-6">
            Tu Rutina Diaria en 3 Pasos
          </h2>
          <p className="text-xl opacity-80 max-w-2xl mx-auto">
            Diseñado para ser simple, efectivo y formar un hábito duradero
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step) => (
            <div key={step.number} className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-3xl font-bold text-white mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
                  {step.number}
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-md">
                  <step.Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
              <p className="opacity-80 leading-relaxed mb-4">{step.description}</p>
              <div className="space-y-2">
                <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-app-input-bg border border-app-divider">
                  {step.duration}
                </div>
                <div className="block text-sm opacity-70 italic">{step.tip}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-block p-6 rounded-2xl bg-app-form-bg border border-app-divider">
            <p className="text-lg font-semibold mb-2">
              <span className="text-amber-500">Total Diario:</span>
            </p>
            <p className="opacity-80">
              Solo <span className="font-bold text-amber-500">12-28 minutos</span> para transformar
              tu vida
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
