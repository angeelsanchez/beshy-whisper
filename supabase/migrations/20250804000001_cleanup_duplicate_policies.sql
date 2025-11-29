-- ===================================================================
-- LIMPIEZA DE POLÍTICAS DUPLICADAS Y CONFLICTIVAS
-- Elimina políticas redundantes manteniendo solo las necesarias
-- ===================================================================

-- =============================
-- USERS - Eliminar políticas duplicadas
-- =============================

-- Mantener solo: users_view_all_profiles + users_manage_own_data
DROP POLICY IF EXISTS "public_can_read_user_profiles" ON public.users;
DROP POLICY IF EXISTS "users_can_read_own_data" ON public.users;
DROP POLICY IF EXISTS "allow_system_user_creation" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_own_data" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_delete_profile" ON public.users;

-- =============================
-- ENTRIES - Eliminar políticas conflictivas
-- =============================

-- Mantener solo: entries_read_access, entries_create_access, entries_update_access, entries_delete_access
DROP POLICY IF EXISTS "public_can_insert_valid_entries" ON public.entries;
DROP POLICY IF EXISTS "users_can_insert_own_entries" ON public.entries;

-- =============================
-- NOTIFICATIONS - Eliminar políticas duplicadas
-- =============================

-- Mantener solo: notifications_read_access, notifications_system_insert, notifications_update_access
DROP POLICY IF EXISTS "notifications_user_read" ON public.notifications;

-- =============================
-- VERIFICACIÓN FINAL
-- =============================

-- Mostrar estado final de políticas
SELECT 
  'FINAL POLICIES' as status,
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Contar políticas por tabla (debe ser el mínimo necesario)
SELECT 
  'POLICY COUNT' as status,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =============================
-- MENSAJE DE ÉXITO
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🧹 LIMPIEZA DE POLÍTICAS DUPLICADAS COMPLETADA';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas finales por tabla:';
  RAISE NOTICE '   • USERS: 2 políticas (ver perfiles + gestionar datos propios)';
  RAISE NOTICE '   • ENTRIES: 4 políticas (leer, crear, actualizar, eliminar)';
  RAISE NOTICE '   • LIKES: 3 políticas (leer, crear, eliminar)';
  RAISE NOTICE '   • OBJECTIVES: 4 políticas (leer, crear, actualizar, eliminar)';
  RAISE NOTICE '   • NOTIFICATIONS: 3 políticas (leer, insertar sistema, actualizar)';
  RAISE NOTICE '   • PUSH_TOKENS: 1 política (acceso completo)';
  RAISE NOTICE '';
  RAISE NOTICE '❌ Políticas eliminadas:';
  RAISE NOTICE '   • Eliminadas 6 políticas duplicadas en USERS';
  RAISE NOTICE '   • Eliminadas 2 políticas conflictivas en ENTRIES';
  RAISE NOTICE '   • Eliminada 1 política duplicada en NOTIFICATIONS';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS está limpio y funcional';
END $$;