'use client';

import AppDemo from '@/components/AppDemo';

export default function AppDemoSection() {
  return (
    <section
      id="demo"
      aria-labelledby="demo-title"
      className="py-20 bg-app-form-bg text-app-text"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 id="demo-title" className="text-4xl md:text-5xl font-bold mb-6">
            Prueba Beshy Whisper en Acción
          </h2>
          <p className="text-xl opacity-80 max-w-2xl mx-auto">
            Ve cómo funciona antes de crear tu cuenta
          </p>
        </div>
        <AppDemo />
      </div>
    </section>
  );
}
