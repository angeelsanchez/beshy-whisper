-- Migration to add likes table for BESHY Whisper

-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  entry_id UUID NOT NULL REFERENCES public.entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add a unique constraint to prevent duplicate likes
  UNIQUE(user_id, entry_id)
);

-- Add row level security
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Cualquiera puede leer likes" ON public.likes;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios likes" ON public.likes;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios likes" ON public.likes;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
END;
$$;

-- Policies for likes table
CREATE POLICY "Cualquiera puede leer likes" 
  ON public.likes FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar sus propios likes" 
  ON public.likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios likes" 
  ON public.likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Create index for faster lookups if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'likes_user_id_idx'
  ) THEN
    CREATE INDEX likes_user_id_idx ON public.likes(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'likes_entry_id_idx'
  ) THEN
    CREATE INDEX likes_entry_id_idx ON public.likes(entry_id);
  END IF;
END;
$$; 