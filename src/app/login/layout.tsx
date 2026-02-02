import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Iniciar Sesion',
  description:
    'Inicia sesion en BESHY Whisper para escribir tu diario anonimo. Accede con Google o credenciales.',
  alternates: {
    canonical: 'https://whisper.beshy.es/login',
  },
};

export default function LoginLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
