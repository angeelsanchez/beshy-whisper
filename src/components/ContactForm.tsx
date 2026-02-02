'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactForm({ isOpen, onClose }: ContactFormProps) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Soporte BESHY',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simular envío del formulario
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aquí podrías integrar con tu API de contacto
      // Por ahora solo simulamos el éxito
      setSubmitStatus('success');
      
      // Resetear formulario después de 2 segundos
      setTimeout(() => {
        setFormData({ name: '', email: '', subject: 'Soporte BESHY', message: '' });
        setSubmitStatus('idle');
        onClose();
      }, 2000);
      
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="relative w-full max-w-md rounded-2xl shadow-2xl transition-all duration-300 transform"
        style={{
          background: `linear-gradient(135deg, ${colors.background}, ${colors.formBg})`,
          border: `2px solid ${colors.inputBorder}`
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.divider }}>
          <h2 className="text-2xl font-bold">Contactar Soporte</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-opacity-20 transition-all duration-200"
            style={{ backgroundColor: colors.inputBg }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Nombre *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-amber-400"
              style={{
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.text
              }}
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-amber-400"
              style={{
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.text
              }}
              placeholder="tu@email.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              Asunto
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-amber-400"
              style={{
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.text
              }}
              placeholder="Asunto de tu consulta"
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Mensaje *
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              value={formData.message}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl resize-none transition-all duration-300 focus:ring-2 focus:ring-amber-400"
              style={{
                backgroundColor: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                color: colors.text
              }}
              placeholder="Describe tu consulta o problema..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-landing gradient-button"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
        </form>

        {/* Success/Error Messages */}
        {submitStatus === 'success' && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">¡Mensaje Enviado!</h3>
            <p className="text-green-600">Te responderemos en las próximas 24 horas.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Error al Enviar</h3>
            <p className="text-red-600">Por favor, inténtalo de nuevo o contacta directamente a hola@beshy.es</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 text-center border-t" style={{ borderColor: colors.divider }}>
          <p className="text-sm opacity-70 mb-2">
            También puedes contactarnos directamente:
          </p>
          <a
            href="mailto:hola@beshy.es"
            className="text-amber-500 hover:text-amber-600 font-medium transition-colors duration-200"
          >
            hola@beshy.es
          </a>
        </div>
      </div>
    </div>
  );
} 