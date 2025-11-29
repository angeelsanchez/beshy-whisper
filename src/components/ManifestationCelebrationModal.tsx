'use client';

import { useRef, useEffect, useState } from 'react';
import { X, Sparkles, Share2, Lock } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { FulfilledManifestation } from '@/hooks/useManifestations';

interface ManifestationCelebrationModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly manifestation: FulfilledManifestation | null;
  readonly isDay: boolean;
  readonly onShare: (manifestation: FulfilledManifestation) => void;
}

export default function ManifestationCelebrationModal({
  isOpen,
  onClose,
  manifestation,
  isDay,
  onShare,
}: ManifestationCelebrationModalProps): React.ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  useFocusTrap(modalRef, { isActive: isOpen, onClose });

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !manifestation) return null;

  const bgColor = isDay ? 'bg-[#F5F0E1]' : 'bg-[#2D1E1A]';
  const textColor = isDay ? 'text-[#4A2E1B]' : 'text-[#F5F0E1]';
  const secondaryText = isDay ? 'text-[#4A2E1B]/60' : 'text-[#F5F0E1]/60';
  const accentColor = '#D4A574';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <Sparkles
                className="w-4 h-4"
                style={{ color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#D4A574'][Math.floor(Math.random() * 4)] }}
              />
            </div>
          ))}
        </div>
      )}

      <div
        ref={modalRef}
        className={`relative w-full max-w-md rounded-2xl ${bgColor} shadow-2xl p-6 animate-celebration-pop`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors ${textColor}`}
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-glow"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Sparkles className="w-10 h-10" style={{ color: accentColor }} strokeWidth={1.5} />
          </div>

          <h2 id="celebration-title" className={`text-2xl font-bold mb-2 ${textColor}`}>
            ¡Manifestación cumplida!
          </h2>

          <p className={`text-sm mb-6 ${secondaryText}`}>
            Lo que visualizaste con fe, ahora es realidad
          </p>

          <div
            className={`rounded-xl p-4 mb-6 ${isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'}`}
          >
            <p className={`text-lg font-medium mb-4 ${textColor}`}>
              &ldquo;{manifestation.content}&rdquo;
            </p>

            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: accentColor }}>
                  {manifestation.daysManifesting}
                </p>
                <p className={`text-xs ${secondaryText}`}>días manifestando</p>
              </div>
              <div className={`w-px h-10 ${isDay ? 'bg-[#4A2E1B]/20' : 'bg-[#F5F0E1]/20'}`} />
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: accentColor }}>
                  {manifestation.reaffirmationCount}
                </p>
                <p className={`text-xs ${secondaryText}`}>reafirmaciones</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => onShare(manifestation)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <Share2 className="w-5 h-5" strokeWidth={2} />
              Compartir mi logro
            </button>

            <button
              onClick={onClose}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all ${
                isDay
                  ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/15'
                  : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/15'
              }`}
            >
              <Lock className="w-4 h-4" strokeWidth={2} />
              Guardar en privado
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes celebration-pop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-celebration-pop {
          animation: celebration-pop 0.4s ease-out forwards;
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(212, 165, 116, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(212, 165, 116, 0.5);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
