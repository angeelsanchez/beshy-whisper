import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <FileQuestion
          className="mx-auto mb-4 h-16 w-16 opacity-50"
          strokeWidth={1.5}
        />
        <h1 className="mb-2 text-2xl font-bold">Pagina no encontrada</h1>
        <p className="mb-6 text-sm opacity-70">
          La pagina que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
