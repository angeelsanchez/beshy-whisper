import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Faltan variables de entorno de Supabase. Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);

export type User = {
  id: string;
  email: string;
  alias: string;
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
