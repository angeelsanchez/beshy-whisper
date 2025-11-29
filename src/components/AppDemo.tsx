'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';

export default function AppDemo() {
  const { isDay, colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');

  const demoSteps = [
    {
      title: "Escribe tu Susurro",
      description: "Recibe prompts inteligentes según la hora",
      prompt: isDay ? "¿Qué te ha hecho sonreír hoy?" : "¿Qué te gustaría recordar de este día?",
      placeholder: "Escribe aquí tu reflexión..."
    },
    {
      title: "Personaliza tu Experiencia",
      description: "Ajusta el tema y exporta como imagen",
      prompt: "Personaliza y comparte",
      placeholder: "Añade tu toque personal..."
    },
    {
      title: "Conecta con la Comunidad",
      description: "Interactúa y descubre otros susurros",
      prompt: "Conecta y crece",
      placeholder: "Explora la comunidad..."
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % demoSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [demoSteps.length]);

  useEffect(() => {
    if (currentStep === 0) {
      setIsTyping(true);
      setTypedText('');
      
      const text = "Hoy me sentí agradecido por...";
      let index = 0;
      
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          setTypedText(text.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, 100);
      
      return () => clearInterval(typeInterval);
    }
  }, [currentStep]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Experimenta BESHY
        </h2>
        <p className="text-lg opacity-80">
          Ve cómo funciona nuestra aplicación en tiempo real
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Demo App Interface */}
        <div className="relative">
          <div 
            className="rounded-3xl p-6 shadow-2xl transition-all duration-500 transform hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${colors.formBg}, ${colors.inputBg})`,
              border: `2px solid ${colors.inputBorder}`,
              minHeight: '400px'
            }}
          >
            {/* App Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"></div>
                <span className="font-semibold">BESHY</span>
              </div>
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
            </div>

            {/* Current Step Display */}
            <div className="text-center mb-6">
              <div className="text-sm opacity-70 mb-2">
                {demoSteps[currentStep].title}
              </div>
              <div className="text-lg font-medium">
                {demoSteps[currentStep].description}
              </div>
            </div>

            {/* Interactive Demo Area */}
            <div className="space-y-4">
              {/* Prompt Display */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="text-sm opacity-70 mb-1">Prompt del día:</div>
                <div className="font-medium">{demoSteps[currentStep].prompt}</div>
              </div>

              {/* Text Input Simulation */}
              <div className="relative">
                <textarea
                  className="w-full p-4 rounded-xl resize-none transition-all duration-300 focus:ring-2 focus:ring-amber-400"
                  style={{
                    backgroundColor: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    color: colors.text,
                    minHeight: '120px'
                  }}
                  placeholder={demoSteps[currentStep].placeholder}
                  value={currentStep === 0 ? typedText : ''}
                  readOnly
                />
                {currentStep === 0 && isTyping && (
                  <div className="absolute bottom-4 right-4 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button 
                  className="flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 btn-landing gradient-button"
                  style={{
                    backgroundColor: colors.primary,
                    color: 'white'
                  }}
                >
                  {currentStep === 0 ? 'Guardar' : currentStep === 1 ? 'Personalizar' : 'Explorar'}
                </button>
                <button 
                  className="py-3 px-4 rounded-xl border transition-all duration-300 hover:scale-105 btn-landing border-button"
                  style={{
                    borderColor: colors.inputBorder,
                    color: colors.text
                  }}
                >
                  {currentStep === 0 ? 'Borrar' : currentStep === 1 ? 'Exportar' : 'Conectar'}
                </button>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full animate-float"></div>
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-float-delayed"></div>
        </div>

        {/* Step Indicators */}
        <div className="space-y-6">
          {demoSteps.map((step, index) => (
            <div
              key={index}
              className={`p-6 rounded-2xl transition-all duration-500 transform ${
                currentStep === index 
                  ? 'scale-105 shadow-xl' 
                  : 'scale-100 opacity-70'
              }`}
              style={{
                background: `linear-gradient(135deg, ${colors.background}, ${colors.formBg})`,
                border: `1px solid ${colors.inputBorder}`
              }}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                  currentStep === index
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white scale-110'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="opacity-80 leading-relaxed">{step.description}</p>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: currentStep === index ? '100%' : currentStep > index ? '100%' : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mt-12">
        <p className="text-lg mb-6 opacity-80">
          ¿Te gusta lo que ves? ¡Únete a nuestra comunidad!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <button className="px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 btn-landing gradient-button">
              Probar BESHY
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
} 