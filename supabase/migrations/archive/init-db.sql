-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  alias TEXT UNIQUE NOT NULL,
  reset_token TEXT,
  reset_token_expires TIMESTAMP
);

-- Crear tabla de entradas
CREATE TABLE IF NOT EXISTS public.entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  nombre TEXT,
  mensaje TEXT NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip TEXT,
  franja TEXT CHECK (franja IN ('DIA', 'NOCHE')),
  guest BOOLEAN DEFAULT FALSE
);

-- Políticas de seguridad para la tabla users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden leer sus propios datos" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar sus propios datos" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Políticas de seguridad para la tabla entries
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede leer entries" 
  ON public.entries FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar entries" 
  ON public.entries FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR guest = true);

CREATE POLICY "Usuarios pueden actualizar sus propios entries" 
  ON public.entries FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios entries" 
  ON public.entries FOR DELETE 
  USING (auth.uid() = user_id);

-- Permitir acceso anónimo a las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- Crear un usuario de ejemplo
INSERT INTO public.users (email, password_hash, alias)
VALUES ('ejemplo@beshy.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'BSY001')
ON CONFLICT (email) DO NOTHING;

-- Crear una entrada de ejemplo
INSERT INTO public.entries (user_id, nombre, mensaje, fecha, ip, franja, guest)
SELECT 
  id, 
  '', 
  '¡Hola! Este es un mensaje de ejemplo para probar la aplicación.',
  NOW(),
  '127.0.0.1',
  'DIA',
  false
FROM public.users
WHERE email = 'ejemplo@beshy.com'
LIMIT 1;

-- Crear una entrada de invitado de ejemplo
INSERT INTO public.entries (user_id, nombre, mensaje, fecha, ip, franja, guest)
VALUES (
  NULL,
  'Invitado',
  'Este es un mensaje de ejemplo de un usuario invitado.',
  NOW(),
  '127.0.0.1',
  'NOCHE',
  true
); 