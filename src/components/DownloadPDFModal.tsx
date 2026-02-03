'use client';

import { useState, useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface DownloadPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ReadonlyArray<{
    id: string;
    mensaje: string;
    fecha: string;
    franja: 'DIA' | 'NOCHE';
    objectives?: ReadonlyArray<{
      id: string;
      text: string;
      done: boolean;
    }>;
    is_private?: boolean;
    mood?: string | null;
  }>;
  userName: string;
  userId: string;
  bsyId: string;
  profilePhotoUrl?: string | null;
  isDay: boolean;
}

export default function DownloadPDFModal({
  isOpen,
  onClose,
  entries,
  userName,
  userId,
  bsyId,
  profilePhotoUrl,
  isDay,
}: Readonly<DownloadPDFModalProps>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('Generando tu PDF...');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, { isActive: isOpen, onClose });

  if (!isOpen) return null;

  const generatePDF = async (): Promise<void> => {
    setError(null);
    setIsGenerating(true);
    setProgressMessage('Generando tu PDF...');

    const slowTimer = setTimeout(() => {
      setProgressMessage('Esto puede tardar unos segundos más...');
    }, 3000);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          userName,
          userId,
          isDay,
          bsyId,
          profilePhotoUrl: profilePhotoUrl ?? null,
        }),
      });

      if (!response.ok) {
        if (response.status === 408) {
          setError('La generación tardó demasiado. Intenta de nuevo.');
          return;
        }
        if (response.status === 429) {
          setError('Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.');
          return;
        }
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Error al generar el PDF. Intenta de nuevo.');
        return;
      }

      const blob = await response.blob();
      const formattedDate = new Date().toISOString().split('T')[0];
      const fileName = `beshy-whispers-${userId}-${formattedDate}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      const canNativeShare = typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [file] });

      if (canNativeShare) {
        await navigator.share({ files: [file], title: 'Mis Whispers' });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();

        setTimeout(() => {
          downloadLink.remove();
          URL.revokeObjectURL(blobUrl);
        }, 100);
      }

      setTimeout(() => {
        onClose();
        setIsGenerating(false);
      }, 500);
    } catch {
      setError('Error de conexión. Comprueba tu red e intenta de nuevo.');
    } finally {
      clearTimeout(slowTimer);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="fixed inset-0" aria-hidden="true" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
        className={`relative w-full max-w-md p-6 rounded-lg shadow-lg ${isDay ? 'bg-[#F5F0E1] text-[#4A2E1B]' : 'bg-[#2D1E1A] text-[#F5F0E1]'}`}
      >
        <h2 id="pdf-modal-title" className="text-xl font-bold mb-4">Descargar mis pensamientos</h2>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {isGenerating ? (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-current mb-4"></div>
            <p className="mb-2">{progressMessage}</p>
            <p className="text-sm opacity-75">Se generará un PDF con {entries.length} whispers.</p>
          </div>
        ) : (
          <>
            <p className="mb-6">
              Estás a punto de guardar una copia de todo lo que has escrito aquí. Nadie más verá este archivo: es solo para ti.
            </p>

            <p className="text-sm opacity-75 mb-6">
              Guárdalo en un lugar seguro.
            </p>
          </>
        )}

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              isDay
                ? 'bg-[#4A2E1B]/10 hover:bg-[#4A2E1B]/20 text-[#4A2E1B]'
                : 'bg-[#F5F0E1]/10 hover:bg-[#F5F0E1]/20 text-[#F5F0E1]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Cancelar descarga"
          >
            Cancelar
          </button>

          <button
            onClick={generatePDF}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md transition-all duration-200 cursor-pointer ${
              isDay
                ? 'bg-[#4A2E1B] text-[#F5F0E1] hover:bg-[#3A1E0B]'
                : 'bg-[#F5F0E1] text-[#2D1E1A] hover:bg-[#E5E0D1]'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm hover:shadow-md`}
            style={{ cursor: isGenerating ? 'wait' : 'pointer' }}
            aria-label="Descargar PDF con mis pensamientos"
          >
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
