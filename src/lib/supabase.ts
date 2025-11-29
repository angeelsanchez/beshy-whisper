import { createClient } from '@supabase/supabase-js';

// Asegúrate de que las variables de entorno estén definidas correctamente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificación de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Faltan variables de entorno de Supabase. Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local');
}

// Custom fetch function that adds the user ID header if available
const customFetch = (...args: Parameters<typeof fetch>) => {
  // Get the original request
  const [url, options = {}] = args;
  
  // Clone the options to avoid modifying the original
  const customOptions = { ...options };
  
  // Add headers if they don't exist
  customOptions.headers = customOptions.headers || {};
  
  // Try to get the user ID from localStorage
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('supabase-user-id');
    if (userId) {
      // Add the user ID as a custom header
      (customOptions.headers as Record<string, string>)['x-user-id'] = userId;
    }
  }
  
  // Return the modified fetch
  return fetch(url, customOptions);
};

// Crear cliente de Supabase
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false, // No persistir la sesión para evitar problemas en SSR
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      fetch: customFetch, // Use our custom fetch function
    },
  }
);

export type User = {
  id: string;
  email: string;
  alias: string; // BSYXXX
  reset_token?: string;
  reset_token_expires?: Date;
};

export type Entry = {
  id: string;
  user_id: string;
  nombre: string;
  mensaje: string;
  fecha: Date;
  ip: string;
  franja: 'DIA' | 'NOCHE';
  guest: boolean;
}; 