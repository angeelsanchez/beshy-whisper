'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Objective {
  id: string;
  text: string;
  done: boolean;
}

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: {
    id: string;
    mensaje: string;
    fecha: string;
    franja: 'DIA' | 'NOCHE';
    display_name: string;
    display_id: string;
    profile_photo_url?: string | null;
  };
  isDay: boolean;
}

type ImageMode = 'normal' | 'bubble' | 'sticker';

export default function SocialShareModal({
  isOpen,
  onClose,
  entry,
  isDay
}: Readonly<SocialShareModalProps>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMode, setActiveMode] = useState<ImageMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !entry.id) return;

    const fetchObjectives = async (): Promise<void> => {
      const { data, error: fetchError } = await supabase
        .from('objectives')
        .select('*')
        .eq('entry_id', entry.id)
        .order('created_at', { ascending: true });

      if (!fetchError && data) {
        setObjectives(data);
      }
    };

    fetchObjectives();
  }, [isOpen, entry.id]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsGenerating(false);
      setActiveMode(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleShare = useCallback(async (mode: ImageMode): Promise<void> => {
    setIsGenerating(true);
    setActiveMode(mode);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: entry.mensaje,
          objetivos: objectives,
          display_name: entry.display_name,
          display_id: entry.display_id,
          fecha: entry.fecha,
          mode,
          isDay,
          profile_photo_url: entry.profile_photo_url ?? null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], `beshy-${mode}-${Date.now()}.png`, { type: 'image/png' });

      if ('share' in navigator && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Mi whisper BESHY',
            text: `${entry.mensaje}\n\n#BESHY #Whisper`,
            files: [file]
          });
          onClose();
          return;
        } catch (error_) {
          if (error_ instanceof Error && error_.name === 'AbortError') {
            return;
          }
        }
      }

      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
      setActiveMode(null);
    }
  }, [entry, objectives, isDay, onClose]);

  const handleCopyText = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(entry.mensaje);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar el texto');
    }
  };

  const handleWhatsApp = (): void => {
    const text = `${entry.mensaje}\n\n#BESHY #Whisper`;
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    globalThis.open(url, '_blank');
  };

  if (!isOpen) return null;

  const borderColor = isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10';
  const subtleText = isDay ? 'text-[#4A2E1B]/50' : 'text-[#F5F0E1]/50';
  const hoverBg = isDay ? 'hover:bg-[#4A2E1B]/5' : 'hover:bg-[#F5F0E1]/5';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 backdrop-blur-sm bg-black/30 cursor-default"
        onClick={onClose}
      />
      <dialog
        open
        aria-label="Compartir whisper"
        className={`
        relative m-0 p-0 border-none
        ${isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'}
        rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[340px] sm:mx-4
        shadow-2xl
        ${isDay ? 'shadow-[0_-4px_32px_rgba(74,46,27,0.15)]' : 'shadow-[0_-4px_32px_rgba(0,0,0,0.5)]'}
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${borderColor}`}>
          <h3 className="text-sm font-semibold">Compartir</h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-colors ${hoverBg}`}
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Error */}
          {error && (
            <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
              isDay
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-red-900/20 border border-red-800/50 text-red-300'
            }`}>
              {error}
            </div>
          )}

          {/* Image format buttons */}
          <p className={`text-[11px] font-medium uppercase tracking-wider mb-2.5 ${subtleText}`}>
            Compartir como imagen
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <FormatButton
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              label="Burbuja"
              isDay={isDay}
              isLoading={isGenerating && activeMode === 'bubble'}
              disabled={isGenerating}
              onClick={() => handleShare('bubble')}
            />
            <FormatButton
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              }
              label="Sticker"
              isDay={isDay}
              isLoading={isGenerating && activeMode === 'sticker'}
              disabled={isGenerating}
              onClick={() => handleShare('sticker')}
            />
            <FormatButton
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              }
              label="Story"
              isDay={isDay}
              isLoading={isGenerating && activeMode === 'normal'}
              disabled={isGenerating}
              onClick={() => handleShare('normal')}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex-1 h-px ${isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'}`} />
            <span className={`text-[10px] uppercase tracking-wider ${subtleText}`}>o solo texto</span>
            <div className={`flex-1 h-px ${isDay ? 'bg-[#4A2E1B]/10' : 'bg-[#F5F0E1]/10'}`} />
          </div>

          {/* Text actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyText}
              className={`
                flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium transition-all
                ${isDay
                  ? 'bg-[#4A2E1B]/5 hover:bg-[#4A2E1B]/10 active:bg-[#4A2E1B]/15'
                  : 'bg-[#F5F0E1]/5 hover:bg-[#F5F0E1]/10 active:bg-[#F5F0E1]/15'
                }
              `}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copiar texto
                </>
              )}
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 active:bg-[#25D366]/25 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              WhatsApp
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function FormatButton({
  icon,
  label,
  isDay,
  isLoading,
  disabled,
  onClick
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly isDay: boolean;
  readonly isLoading: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all
        ${isDay
          ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] active:scale-95'
          : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E8E0D0] active:scale-95'
        }
        disabled:opacity-40 disabled:scale-100
      `}
    >
      {isLoading ? (
        <div className={`animate-spin rounded-full h-5 w-5 border-2 border-t-transparent ${
          isDay ? 'border-[#F5F0E1]' : 'border-[#2D1E1A]'
        }`} />
      ) : (
        icon
      )}
      <span className="text-[11px] font-semibold">{isLoading ? 'Generando...' : label}</span>
    </button>
  );
}
