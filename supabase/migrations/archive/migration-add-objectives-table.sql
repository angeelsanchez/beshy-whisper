-- Migration to add objectives table for BESHY Whisper

-- Create objectives table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add row level security
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Cualquiera puede leer objetivos" ON public.objectives;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios objetivos" ON public.objectives;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios objetivos" ON public.objectives;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
  
  BEGIN
    DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios objetivos" ON public.objectives;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
  END;
END;
$$;

-- Policies for objectives table
CREATE POLICY "Cualquiera puede leer objetivos" 
  ON public.objectives FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar sus propios objetivos" 
  ON public.objectives FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios objetivos" 
  ON public.objectives FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios objetivos" 
  ON public.objectives FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'objectives_entry_id_idx'
  ) THEN
    CREATE INDEX objectives_entry_id_idx ON public.objectives(entry_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'objectives_user_id_idx'
  ) THEN
    CREATE INDEX objectives_user_id_idx ON public.objectives(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'objectives_done_idx'
  ) THEN
    CREATE INDEX objectives_done_idx ON public.objectives(done);
  END IF;
END;
$$; 