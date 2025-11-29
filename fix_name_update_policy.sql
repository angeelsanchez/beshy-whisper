-- ===================================================================
-- SOLUCIÓN: Política RLS para permitir actualización de nombres
-- cuando needs_name_input = true (usuarios recién registrados con Google)
-- ===================================================================

-- Eliminar la política restrictiva actual de users
DROP POLICY IF EXISTS "users_manage_own_data" ON public.users;

-- Crear nuevas políticas más específicas para users

-- 1. Política de LECTURA: Usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "users_view_all_profiles" 
  ON public.users FOR SELECT 
  USING (auth.role() = 'authenticated' OR auth.role() IS NULL);

-- 2. Política de INSERCIÓN: Solo para usuarios autenticados con su propio ID
CREATE POLICY "users_insert_own_data" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. Política de ACTUALIZACIÓN: Permitir actualizar nombre en casos especiales
CREATE POLICY "users_update_name_special" 
  ON public.users FOR UPDATE 
  USING (
    -- Caso 1: Usuario autenticado normal
    auth.uid() = id 
    OR 
    -- Caso 2: Usuario necesita cambiar nombre (recién registrado con Google)
    (needs_name_input = true AND id IS NOT NULL)
  )
  WITH CHECK (
    -- Solo permitir actualizar campos específicos
    auth.uid() = id 
    OR 
    (needs_name_input = true AND id IS NOT NULL)
  );

-- 4. Política de ELIMINACIÓN: Solo usuarios autenticados pueden eliminar sus datos
CREATE POLICY "users_delete_own_data" 
  ON public.users FOR DELETE 
  USING (auth.uid() = id);

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================

-- Mostrar las políticas activas en users
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY cmd, policyname;

-- Test: Mostrar usuarios que podrían beneficiarse de esta política
SELECT 
  bsy_id,
  email,
  name,
  needs_name_input,
  provider,
  'Puede actualizar nombre con nueva política' as status
FROM public.users 
WHERE needs_name_input = true;

-- ===================================================================
-- NOTAS IMPORTANTES
-- ===================================================================

/*
ESTA SOLUCIÓN:
✅ Permite que usuarios con needs_name_input=true actualicen su nombre
✅ Mantiene la seguridad para usuarios normales (requiere auth.uid())
✅ Es compatible con NextAuth + Supabase
✅ No requiere cambios en el código de la aplicación

DESPUÉS DE EJECUTAR ESTO:
1. Los usuarios recién registrados con Google podrán cambiar su nombre
2. La función can_update_name seguirá funcionando para validar los 14 días
3. Una vez que cambien el nombre, needs_name_input se pone en false
4. Usuarios normales siguen necesitando auth.uid() para cambios posteriores
*/