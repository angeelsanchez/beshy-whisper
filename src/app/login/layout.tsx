import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Iniciar Sesión',
  description:
    'Inicia sesión en BESHY Whisper para escribir tu diario anónimo. Accede con Google o credenciales.',
  alternates: {
    canonical: 'https://whisper.beshy.es/login',
  },
};

export default function LoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
