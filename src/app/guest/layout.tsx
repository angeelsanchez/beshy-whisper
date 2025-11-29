import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Modo Invitado',
  description:
    'Prueba BESHY Whisper sin registrarte. Escribe tu primer susurro como invitado y descubre el journaling diario.',
  alternates: {
    canonical: 'https://whisper.beshy.es/guest',
  },
};

export default function GuestLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
