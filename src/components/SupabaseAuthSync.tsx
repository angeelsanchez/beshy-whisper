'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

/**
 * Este componente sincroniza la sesión de NextAuth con Supabase.
 * Debe incluirse en el componente de layout o providers de la aplicación.
 */
export default function SupabaseAuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    const syncSupabaseAuth = async () => {
      if (!session?.user) {
        // Si no hay sesión, cerrar sesión en Supabase
        await supabase.auth.signOut();
        return;
      }

      try {
        // En lugar de intentar establecer una sesión JWT inválida,
        // simplemente almacenamos el ID de usuario en localStorage
        // para usarlo en las peticiones a Supabase
        if (typeof window !== 'undefined') {
          localStorage.setItem('supabase-user-id', session.user.id);
          console.log('ID de usuario almacenado para Supabase');
        }
      } catch (error) {
        console.error('Error al sincronizar con Supabase:', error);
      }
    };

    syncSupabaseAuth();
  }, [session]);

  // Este es un componente utilitario que no renderiza nada
  return null;
} 