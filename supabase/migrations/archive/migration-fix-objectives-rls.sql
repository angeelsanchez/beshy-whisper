-- Migration to fix Row Level Security (RLS) policies for objectives table

-- Primero, asegurarse de que RLS está habilitado
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes para empezar desde cero
DROP POLICY IF EXISTS "Cualquiera puede leer objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios objetivos" ON public.objectives;

-- Crear política para permitir que cualquiera pueda leer los objetivos
CREATE POLICY "Cualquiera puede leer objetivos" 
  ON public.objectives FOR SELECT 
  USING (true);

-- Crear política para permitir que los usuarios autenticados inserten sus propios objetivos
-- Nota: auth.uid() debe coincidir con user_id
CREATE POLICY "Usuarios autenticados pueden insertar sus propios objetivos" 
  ON public.objectives FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Crear política para permitir que los usuarios actualicen sus propios objetivos
CREATE POLICY "Usuarios pueden actualizar sus propios objetivos" 
  ON public.objectives FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

-- Crear política para permitir que los usuarios eliminen sus propios objetivos
CREATE POLICY "Usuarios pueden eliminar sus propios objetivos" 
  ON public.objectives FOR DELETE 
  USING (auth.uid()::text = user_id::text);

-- Verificar que las políticas se han creado correctamente
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objectives'; 