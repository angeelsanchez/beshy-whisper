'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: 'global-error',
        digest: error.digest ?? 'none',
      },
    });
  }, [error]);

  return (
    <html lang="es">
      <body style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#2D1E1A',
        color: '#F5F0E1',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
      }}>
        <div style={{ padding: '2rem', maxWidth: '400px' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <AlertCircle style={{ width: '4rem', height: '4rem' }} strokeWidth={1.5} color="#EF4444" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Algo salio mal
          </h1>
          <p style={{ opacity: 0.8, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Intenta recargar la pagina. Si el problema persiste, limpia la cache del navegador.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#D97706',
                color: 'white',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => {
                if ('caches' in window) {
                  caches.keys().then(names => names.forEach(n => caches.delete(n)));
                }
                window.location.href = '/';
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#F5F0E1',
                border: '2px solid #F5F0E1',
                borderRadius: '9999px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Limpiar cache
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
