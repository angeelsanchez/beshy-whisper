-- Migration to fix permissions for objectives table in Supabase

-- Verificar si la tabla tiene RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'objectives';

-- Asegurarse de que el rol 'authenticated' tiene permisos para la tabla objectives
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objectives TO authenticated;
GRANT SELECT ON public.objectives TO anon;

-- Verificar las políticas actuales
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objectives';

-- Eliminar todas las políticas existentes para empezar desde cero
DROP POLICY IF EXISTS "Cualquiera puede leer objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios objetivos" ON public.objectives;

-- Crear políticas más permisivas para depuración
-- NOTA: Estas políticas son MÁS PERMISIVAS para ayudar a depurar el problema
-- Una vez que todo funcione, deberías volver a políticas más restrictivas

-- Política para permitir que cualquiera pueda leer los objetivos
CREATE POLICY "Cualquiera puede leer objetivos" 
  ON public.objectives FOR SELECT 
  USING (true);

-- Política para permitir que los usuarios autenticados inserten objetivos
-- Nota: Esta política es más permisiva para depuración
CREATE POLICY "Usuarios autenticados pueden insertar objetivos" 
  ON public.objectives FOR INSERT 
  WITH CHECK (true);

-- Política para permitir que los usuarios actualicen objetivos
-- Nota: Esta política es más permisiva para depuración
CREATE POLICY "Usuarios pueden actualizar objetivos" 
  ON public.objectives FOR UPDATE 
  USING (true);

-- Política para permitir que los usuarios eliminen objetivos
-- Nota: Esta política es más permisiva para depuración
CREATE POLICY "Usuarios pueden eliminar objetivos" 
  ON public.objectives FOR DELETE 
  USING (true);

-- Verificar que las políticas se han creado correctamente
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objectives'; 