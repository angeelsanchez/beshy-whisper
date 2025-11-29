-- Migration to fix objectives table structure

-- Primero, eliminar objetivos huérfanos (que hacen referencia a entradas que ya no existen)
DELETE FROM public.objectives o
WHERE NOT EXISTS (SELECT 1 FROM public.entries e WHERE e.id = o.entry_id);

-- Eliminar objetivos con user_id NULL o inválido
DELETE FROM public.objectives o
WHERE o.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = o.user_id);

-- Make user_id NOT NULL
ALTER TABLE public.objectives 
  ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Check if entry_id foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'objectives_entry_id_fkey' AND conrelid = 'public.objectives'::regclass
  ) THEN
    ALTER TABLE public.objectives
      ADD CONSTRAINT objectives_entry_id_fkey 
      FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE CASCADE;
  END IF;

  -- Check if user_id foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'objectives_user_id_fkey' AND conrelid = 'public.objectives'::regclass
  ) THEN
    ALTER TABLE public.objectives
      ADD CONSTRAINT objectives_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END;
$$;

-- Add row level security if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'objectives' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;

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