'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import ContactForm from './ContactForm';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function FAQ() {
  const { colors } = useTheme();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  const faqData: FAQItem[] = [
    {
      question: "¿Qué es BESHY Whisper?",
      answer: "BESHY es una aplicación de journaling diario que te ayuda a reflexionar sobre tu día a través de prompts inteligentes que cambian según la hora. Es tu espacio personal para expresar pensamientos, emociones y experiencias.",
      category: "General"
    },
    {
      question: "¿Cómo funciona el modo día/noche?",
      answer: "La aplicación detecta automáticamente la hora del día y cambia su interfaz visual y los prompts que te ofrece. Durante el día (6:00 AM - 6:00 PM) tendrás preguntas más energéticas, mientras que por la noche serán más reflexivas.",
      category: "Funcionalidad"
    },
    {
      question: "¿Puedo usar BESHY sin crear cuenta?",
      answer: "¡Sí! Ofrecemos un modo invitado que te permite probar la aplicación sin registro. Podrás crear un susurro y ver cómo funciona, aunque algunas funciones como guardar historial o recibir notificaciones requieren una cuenta.",
      category: "Cuenta"
    },
    {
      question: "¿Cuántos susurros puedo crear por día?",
      answer: "Puedes crear un susurro diurno (entre 6:00 AM y 6:00 PM) y un susurro nocturno (entre 6:00 PM y 6:00 AM). Esto te ayuda a mantener un ritmo saludable de reflexión.",
      category: "Límites"
    },
    {
      question: "¿Puedo exportar mis susurros?",
      answer: "¡Absolutamente! Puedes exportar tus susurros como imágenes personalizables para compartir en redes sociales o guardar en tu dispositivo. También puedes mantener algunos pensamientos privados si lo prefieres.",
      category: "Compartir"
    },
    {
      question: "¿Es seguro compartir mis pensamientos?",
      answer: "Tu privacidad es nuestra prioridad. Puedes elegir qué susurros hacer públicos y cuáles mantener privados. Solo los usuarios registrados pueden interactuar con tus publicaciones públicas.",
      category: "Privacidad"
    },
    {
      question: "¿Cómo funciona la comunidad?",
      answer: "La comunidad de BESHY te permite conectar con otros usuarios a través de likes y comentarios. Puedes descubrir cómo otros ven el mundo y construir conexiones significativas basadas en la reflexión personal.",
      category: "Comunidad"
    },
    {
      question: "¿BESHY es gratuito?",
      answer: "Sí, BESHY es completamente gratuito. No hay costos ocultos ni suscripciones premium. Queremos que todos puedan acceder a las herramientas de autoconocimiento y bienestar.",
      category: "Precio"
    }
  ];

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const categories = Array.from(new Set(faqData.map(item => item.category)));
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const filteredFAQ = selectedCategory === 'Todos' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-lg opacity-80">
            Resolvemos tus dudas sobre BESHY
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['Todos', ...categories].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg'
                  : 'border border-current hover:bg-current hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQ.map((item, index) => (
            <div
              key={index}
              className={`rounded-2xl transition-all duration-300 overflow-hidden ${
                openItems.has(index) ? 'shadow-lg' : 'shadow-md'
              }`}
              style={{
                background: `linear-gradient(135deg, ${colors.background}, ${colors.formBg})`,
                border: `1px solid ${colors.inputBorder}`
              }}
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-opacity-50 transition-all duration-300"
                style={{ backgroundColor: colors.formBg }}
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
                  <span className="text-sm opacity-70 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent font-medium">
                    {item.category}
                  </span>
                </div>
                <div className={`ml-4 transition-transform duration-300 ${
                  openItems.has(index) ? 'rotate-180' : 'rotate-0'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              <div className={`transition-all duration-300 overflow-hidden ${
                openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6 pt-0">
                  <div className="w-full h-px mb-4" style={{ backgroundColor: colors.divider }}></div>
                  <p className="opacity-80 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Help */}
        <div className="text-center mt-12 p-8 rounded-2xl" style={{ backgroundColor: colors.formBg }}>
          <h3 className="text-xl font-semibold mb-4">¿No encuentras tu respuesta?</h3>
          <p className="opacity-80 mb-6">
            Nuestro equipo está aquí para ayudarte con cualquier pregunta adicional
          </p>
          <button 
            onClick={() => setIsContactFormOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium rounded-full hover:shadow-lg transform hover:scale-105 transition-all duration-300 btn-landing gradient-button"
          >
            Contactar Soporte
          </button>
        </div>
      </div>

      {/* Contact Form Modal */}
      <ContactForm 
        isOpen={isContactFormOpen} 
        onClose={() => setIsContactFormOpen(false)} 
      />
    </>
  );
} 