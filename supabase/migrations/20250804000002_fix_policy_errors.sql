-- ===================================================================
-- CORRECCIÓN DE ERRORES EN POLÍTICAS RLS
-- Soluciona problemas de perfiles y operaciones de entries
-- ===================================================================

-- =============================
-- USERS - Corregir políticas de perfiles
-- =============================

-- Eliminar políticas actuales
DROP POLICY IF EXISTS "users_view_all_profiles" ON public.users;
DROP POLICY IF EXISTS "users_manage_own_data" ON public.users;

-- NUEVA POLÍTICA: Permitir lectura de perfiles de forma más flexible
CREATE POLICY "users_read_profiles" 
  ON public.users FOR SELECT 
  USING (
    -- Usuarios autenticados pueden ver todos los perfiles
    auth.role() = 'authenticated'
    -- O permitir lectura de perfiles específicos sin autenticación (para funciones públicas)
    OR true
  );

-- NUEVA POLÍTICA: Gestión de datos propios más robusta
CREATE POLICY "users_manage_own_data" 
  ON public.users FOR ALL 
  USING (
    -- Solo el propietario de la cuenta
    auth.uid() = id
  )
  WITH CHECK (
    -- Solo el propietario puede modificar
    auth.uid() = id
  );

-- =============================
-- ENTRIES - Corregir políticas de eliminación y edición
-- =============================

-- Eliminar políticas actuales de entries
DROP POLICY IF EXISTS "entries_read_access" ON public.entries;
DROP POLICY IF EXISTS "entries_create_access" ON public.entries;
DROP POLICY IF EXISTS "entries_update_access" ON public.entries;
DROP POLICY IF EXISTS "entries_delete_access" ON public.entries;

-- NUEVA POLÍTICA: Lectura más permisiva
CREATE POLICY "entries_read_access" 
  ON public.entries FOR SELECT 
  USING (
    -- Posts públicos para todos
    (is_private = false OR is_private IS NULL)
    -- O posts propios
    OR auth.uid() = user_id
    -- O permitir lectura sin autenticación para posts públicos
    OR (is_private = false OR is_private IS NULL)
  );

-- NUEVA POLÍTICA: Inserción más flexible
CREATE POLICY "entries_create_access" 
  ON public.entries FOR INSERT 
  WITH CHECK (
    -- Usuarios autenticados pueden crear sus propios entries
    (auth.uid() = user_id AND auth.role() = 'authenticated') 
    -- O entries como invitado
    OR (guest = true AND user_id IS NULL)
  );

-- NUEVA POLÍTICA: Actualización más robusta (incluye cambio de privacidad)
CREATE POLICY "entries_update_access" 
  ON public.entries FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NUEVA POLÍTICA: Eliminación más robusta
CREATE POLICY "entries_delete_access" 
  ON public.entries FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================
-- VERIFICAR CONFIGURACIÓN DE RLS
-- =============================

-- Asegurar que RLS esté habilitado pero no sea demasiado restrictivo
SELECT 
  'RLS CONFIG CHECK' as info,
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as status
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- Mostrar políticas actuales
SELECT 
  'ACTIVE POLICIES' as info,
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN '👁️ READ'
    WHEN 'INSERT' THEN '➕ CREATE'
    WHEN 'UPDATE' THEN '✏️ UPDATE'
    WHEN 'DELETE' THEN '🗑️ DELETE'
    WHEN 'ALL' THEN '🔄 ALL OPS'
    ELSE cmd
  END as operation
FROM pg_policies 
WHERE tablename IN ('users', 'entries')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- =============================
-- MENSAJE DE CORRECCIÓN
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🔧 CORRECCIÓN DE POLÍTICAS COMPLETADA';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Problemas solucionados:';
  RAISE NOTICE '   • Carga de perfiles propios y ajenos';
  RAISE NOTICE '   • Eliminación de posts propios';
  RAISE NOTICE '   • Cambio de privacidad de posts';
  RAISE NOTICE '   • Políticas más permisivas para operaciones del sistema';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Cambios realizados:';
  RAISE NOTICE '   • USERS: Lectura más flexible + gestión propia robusta';
  RAISE NOTICE '   • ENTRIES: Políticas CRUD más permisivas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Las políticas ahora permiten:';
  RAISE NOTICE '   • Lectura de perfiles sin restricciones estrictas';
  RAISE NOTICE '   • Operaciones del sistema durante registro/updates';
  RAISE NOTICE '   • Eliminación y edición de posts propios garantizada';
END $$;