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
  };
  isDay: boolean;
  imageDataUrl?: string;
  entryText?: string;
}

export default function SocialShareModal({ 
  isOpen, 
  onClose, 
  entry, 
  isDay,
  imageDataUrl: propImageDataUrl,
  entryText = entry?.mensaje || ''
}: SocialShareModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(propImageDataUrl || null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [nativeShareSupport, setNativeShareSupport] = useState(false);


  // Enhanced native sharing support detection
  const checkNativeShareSupport = () => {
    if (typeof navigator === 'undefined') return false;
    return 'share' in navigator && typeof navigator.share === 'function';
  };

  // Enhanced mobile platform detection
  const getPlatformInfo = () => {
    if (typeof navigator === 'undefined') return { isMobile: false, isIOS: false, isAndroid: false };
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    return { isMobile, isIOS, isAndroid };
  };

  // Initialize native share support detection
  useEffect(() => {
    setNativeShareSupport(checkNativeShareSupport());
  }, []);

  // Load objectives for the entry
  useEffect(() => {
    if (!isOpen || !entry.id) return;

    const fetchObjectives = async () => {
      try {
        const { data, error } = await supabase
          .from('objectives')
          .select('*')
          .eq('entry_id', entry.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error loading objectives:', error);
        } else {
          const objectivesData = data || [];
          setObjectives(objectivesData);
        }
      } catch (err) {
        console.error('Error fetching objectives:', err);
      }
    };

    fetchObjectives();
  }, [isOpen, entry.id]);

  // Format date as dd/mm/yy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day}/${month}/${year}`;
  };

  // Generate shareable image using server-side Puppeteer
  const generateShareImage = useCallback(async (mode: 'normal' | 'bubble' | 'sticker' = 'normal'): Promise<{ dataUrl: string; blob: Blob } | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const payload = {
        mensaje: entry.mensaje,
        objetivos: objectives,
        display_name: entry.display_name,
        display_id: entry.display_id,
        fecha: entry.fecha,
        mode,
        isDay
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to generate image: ${response.status}`);
      }

      const blob = await response.blob();
      const dataUrl = await blobToDataURL(blob);

      setImageDataUrl(dataUrl);
      setLastBlob(blob);
      return { dataUrl, blob };

    } catch (err) {
      console.error('Error generating image:', err);
      setError('No se pudo generar la imagen. Inténtalo de nuevo.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [entry.mensaje, entry.display_name, entry.display_id, entry.fecha, objectives, isDay]);

  // Helper function to convert blob to data URL
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };


  const shareOrDownload = async (blob: Blob, filename: string) => {
    const file = new File([blob], filename, { type: 'image/png' });

    if (nativeShareSupport) {
      try {
        await navigator.share({
          title: 'Mi whisper BESHY',
          text: `${entryText}\n\n#BESHY #Whisper`,
          files: [file]
        });
        return;
      } catch (shareError) {
        if (shareError instanceof Error && shareError.name === 'AbortError') return;
        console.warn('Native share failed, fallback to download:', shareError);
      }
    }

    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  };

  const handleBubbleShare = async () => {
    setError(null);
    try {
      const result = await generateShareImage('bubble');
      if (!result) {
        setError('No se pudo generar la imagen burbuja.');
        return;
      }
      await shareOrDownload(result.blob, `beshy-whisper-bubble-${Date.now()}.png`);
    } catch (err) {
      console.error('Error in bubble share:', err);
      setError('Error al compartir como burbuja. Inténtalo de nuevo.');
    }
  };

  const handleStickerShare = async () => {
    setError(null);
    try {
      const result = await generateShareImage('sticker');
      if (!result) {
        setError('No se pudo generar la imagen sticker.');
        return;
      }
      await shareOrDownload(result.blob, `beshy-whisper-sticker-${Date.now()}.png`);
    } catch (err) {
      console.error('Error in sticker share:', err);
      setError('Error al compartir como sticker. Inténtalo de nuevo.');
    }
  };

  const handleStoryShare = async () => {
    setError(null);
    try {
      const result = await generateShareImage('normal');
      if (!result) {
        setError('No se pudo generar la imagen para story.');
        return;
      }
      await shareOrDownload(result.blob, `beshy-whisper-story-${Date.now()}.png`);
    } catch (err) {
      console.error('Error in story share:', err);
      setError('Error al compartir como story. Inténtalo de nuevo.');
    }
  };

  const shareToSocial = async (platform: string) => {
    const { isMobile } = getPlatformInfo();
    const shareText = `${entryText}\n\n#BESHY #Whisper`;

    try {
      switch (platform) {
        case 'whatsapp': {
          const url = isMobile
            ? `whatsapp://send?text=${encodeURIComponent(shareText)}`
            : `https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
          globalThis.open(url, '_blank');
          break;
        }
        case 'instagram':
          await navigator.clipboard.writeText(shareText);
          alert('Texto copiado al portapapeles. Abre Instagram y pega el contenido en tu historia o post.');
          break;
        case 'facebook': {
          const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(globalThis.location.href)}&quote=${encodeURIComponent(shareText)}`;
          globalThis.open(fbUrl, '_blank', 'width=600,height=400');
          break;
        }
        case 'twitter': {
          const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(globalThis.location.href)}`;
          globalThis.open(twUrl, '_blank', 'width=600,height=400');
          break;
        }
      }
    } catch (err) {
      console.error(`Error sharing to ${platform}:`, err);
      setError(`Error al compartir en ${platform}`);
    }
  };

  const handleNativeShare = async () => {
    if (!nativeShareSupport) {
      setError('Compartir nativo no está disponible en este dispositivo.');
      return;
    }

    try {
      let currentBlob = lastBlob;

      if (!currentBlob) {
        const result = await generateShareImage('normal');
        if (result) currentBlob = result.blob;
      }

      const shareData: ShareData = {
        title: 'Mi entrada en BESHY Whisper',
        text: `${entryText}\n\n#BESHY #Whisper`,
        url: globalThis.location.href,
      };

      if (currentBlob) {
        const file = new File([currentBlob], `beshy-whisper-${Date.now()}.png`, { type: 'image/png' });
        shareData.files = [file];
      }

      await navigator.share(shareData);
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name !== 'AbortError') {
        console.error('Error in native sharing:', shareError);
        setError('Error al compartir de forma nativa');
      }
    }
  };

  // Generate image when modal opens
  useEffect(() => {
    if (isOpen && !imageDataUrl) {
      generateShareImage('normal');
    }
  }, [isOpen, imageDataUrl, generateShareImage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm bg-black/30">
      <div className={`
        ${isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'}
        rounded-t-2xl sm:rounded-2xl w-full sm:w-auto sm:max-w-[350px] mx-4 
        shadow-2xl max-h-[90vh] overflow-y-auto
        ${isDay ? 'shadow-[0_8px_32px_rgba(74,46,27,0.2)]' : 'shadow-[0_8px_32px_rgba(0,0,0,0.6)]'}
      `}>
        {/* Header compacto */}
        <div className={`flex items-center justify-between p-4 border-b ${isDay ? 'border-[#4A2E1B]/10' : 'border-[#F5F0E1]/10'}`}>
          <h3 className="text-base font-semibold">
            Compartir whisper
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-colors ${
              isDay ? 'hover:bg-[#4A2E1B]/10' : 'hover:bg-[#F5F0E1]/10'
            }`}
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content compacto */}
        <div className="p-4">
          {/* Error message */}
          {error && (
            <div className={`mb-3 p-3 rounded-lg text-sm ${
              isDay 
                ? 'bg-red-50 border border-red-200 text-red-700' 
                : 'bg-red-900/20 border border-red-800/50 text-red-300'
            }`}>
              {error}
            </div>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className={`mb-3 p-3 rounded-lg text-sm flex items-center gap-2 ${
              isDay 
                ? 'bg-[#4A2E1B]/5 border border-[#4A2E1B]/10' 
                : 'bg-[#F5F0E1]/5 border border-[#F5F0E1]/10'
            }`}>
              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                isDay ? 'border-[#4A2E1B]' : 'border-[#F5F0E1]'
              }`}></div>
              Generando imagen...
            </div>
          )}

          {/* Entry preview compacto */}
          <div className={`mb-4 p-3 rounded-lg ${
            isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {entry.display_name}
              </span>
              <span className="text-xs opacity-60">@{entry.display_id}</span>
            </div>
            <p className="text-sm mb-1 line-clamp-2">
              {entry.mensaje}
            </p>
            <p className="text-xs opacity-60">
              {formatDate(entry.fecha)}
            </p>
          </div>

          {/* BESHY Share Options - Compacto */}
          <div className="mb-4">
            <h4 className="font-medium mb-3 text-center text-sm">
              ¿Cómo quieres compartir?
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {/* Botón Burbuja - Colores BESHY */}
              <button
                onClick={() => handleBubbleShare()}
                disabled={isGenerating}
                className={`
                  flex items-center justify-center gap-3 p-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg
                  ${isDay 
                    ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B] shadow-[0_4px_16px_rgba(74,46,27,0.2)]' 
                    : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E8E0D0] shadow-[0_4px_16px_rgba(245,240,225,0.2)]'
                  }
                  disabled:opacity-50 disabled:transform-none
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div className="text-left">
                  <div className="font-semibold text-base">Burbuja de Chat</div>
                  <div className="text-xs opacity-80">Con burbuja, cambia según la hora</div>
                </div>
              </button>

              {/* Botón Sticker - Nuevo modo con colores fijos */}
              <button
                onClick={() => handleStickerShare()}
                disabled={isGenerating}
                className={`
                  flex items-center justify-center gap-3 p-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg
                  ${isDay 
                    ? 'bg-gradient-to-r from-[#F5F0E1] to-[#E8E0D0] text-[#4A2E1B] border-2 border-[#4A2E1B]/10 hover:from-[#E8E0D0] hover:to-[#DDD4C4] shadow-[0_4px_16px_rgba(74,46,27,0.1)]' 
                    : 'bg-gradient-to-r from-[#F5F0E1] to-[#E8E0D0] text-[#4A2E1B] border-2 border-[#4A2E1B]/10 hover:from-[#E8E0D0] hover:to-[#DDD4C4] shadow-[0_4px_16px_rgba(74,46,27,0.1)]'
                  }
                  disabled:opacity-50 disabled:transform-none
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div className="text-left">
                  <div className="font-semibold text-base">Imagen Transparente</div>
                  <div className="text-xs opacity-80">Efecto cristal, se lee sobre cualquier fondo</div>
                </div>
              </button>

              {/* Botón Story - Colores BESHY invertidos */}
              <button
                onClick={() => handleStoryShare()}
                disabled={isGenerating}
                className={`
                  flex items-center justify-center gap-3 p-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg
                  ${isDay 
                    ? 'bg-[#F5F0E1] text-[#2D1E1A] border-2 border-[#4A2E1B]/20 hover:bg-[#E8E0D0] shadow-[0_4px_16px_rgba(245,240,225,0.2)]' 
                    : 'bg-[#4A2E1B] text-[#F5F0E1] border-2 border-[#F5F0E1]/20 hover:bg-[#3A1E0B] shadow-[0_4px_16px_rgba(74,46,27,0.2)]'
                  }
                  disabled:opacity-50 disabled:transform-none
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="font-semibold text-base">Para Stories</div>
                  <div className="text-xs opacity-80">Formato completo, cambia según hora</div>
                </div>
              </button>
            </div>
          </div>

          {/* Opciones adicionales - Colapsables */}
          <div className="mb-4">
            <details className="group">
              <summary className={`
                flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                ${isDay 
                  ? 'bg-[#4A2E1B]/5 hover:bg-[#4A2E1B]/10' 
                  : 'bg-[#F5F0E1]/5 hover:bg-[#F5F0E1]/10'
                }
              `}>
                <span className="font-medium text-sm">Más opciones</span>
                <svg className="w-4 h-4 opacity-60 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className={`mt-2 p-3 rounded-lg ${
                isDay ? 'bg-[#4A2E1B]/5' : 'bg-[#F5F0E1]/5'
              }`}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => shareToSocial('whatsapp')}
                    disabled={isGenerating}
                    className={`
                      flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-xs
                      ${isDay
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => shareToSocial('instagram')}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-lg transition-colors text-xs"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </button>
                  <button
                    onClick={() => shareToSocial('facebook')} 
                    disabled={isGenerating}
                    className={`
                      flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-xs
                      ${isDay
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </button>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    disabled={isGenerating}
                    className={`
                      flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-xs
                      ${isDay
                        ? 'bg-black hover:bg-gray-800 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                      }
                      disabled:opacity-50
                    `}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                    Twitter/X
                  </button>
                </div>
              </div>
            </details>
          </div>

          {/* Native sharing (PWA support) */}
          {nativeShareSupport && (
            <div>
              <h4 className="font-medium mb-3 text-sm">
                Compartir nativo
              </h4>
              <button
                onClick={handleNativeShare}
                disabled={isGenerating}
                className={`
                  w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-colors text-sm
                  ${isDay 
                    ? 'bg-[#4A2E1B]/10 text-[#4A2E1B] hover:bg-[#4A2E1B]/20' 
                    : 'bg-[#F5F0E1]/10 text-[#F5F0E1] hover:bg-[#F5F0E1]/20'
                  }
                  disabled:opacity-50
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Usar menú del sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}