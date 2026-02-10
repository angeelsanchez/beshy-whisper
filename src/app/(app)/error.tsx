'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        boundary: 'app-error',
        digest: error.digest ?? 'none',
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <AlertTriangle
          className="mx-auto mb-4 h-14 w-14 text-amber-500"
          strokeWidth={1.5}
        />
        <h2 className="mb-2 text-xl font-bold">Algo no ha ido bien</h2>
        <p className="mb-6 text-sm opacity-70">
          Ha ocurrido un error inesperado. Puedes intentar de nuevo o volver al feed.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Reintentar
          </button>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 rounded-full border-2 border-current px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
          >
            <Home className="h-4 w-4" strokeWidth={2} />
            Ir al feed
          </Link>
        </div>
      </div>
    </div>
  );
}
