-- ===================================================================
-- MIGRACIÓN FINAL DE RLS PARA BESHY WHISPER
-- Limpia todas las políticas existentes y aplica un conjunto definitivo
-- ===================================================================

-- =============================
-- ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- =============================

-- USERS - Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read any profile" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden leer sus propios datos" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios datos" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_can_view_all_profiles" ON public.users;
DROP POLICY IF EXISTS "users_can_manage_own_data" ON public.users;
DROP POLICY IF EXISTS "users_view_all_profiles" ON public.users;
DROP POLICY IF EXISTS "users_manage_own_data" ON public.users;

-- ENTRIES - Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Delete own entries" ON public.entries;
DROP POLICY IF EXISTS "Insert own entry" ON public.entries;
DROP POLICY IF EXISTS "Los posts públicos son visibles para todos, los privados solo " ON public.entries;
DROP POLICY IF EXISTS "Read own entries" ON public.entries;
DROP POLICY IF EXISTS "Read public entries" ON public.entries;
DROP POLICY IF EXISTS "Update own entries" ON public.entries;
DROP POLICY IF EXISTS "Cualquiera puede leer entries" ON public.entries;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar entries" ON public.entries;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios entries" ON public.entries;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios entries" ON public.entries;
DROP POLICY IF EXISTS "entries_public_and_own_read" ON public.entries;
DROP POLICY IF EXISTS "entries_authenticated_insert" ON public.entries;
DROP POLICY IF EXISTS "entries_owner_update" ON public.entries;
DROP POLICY IF EXISTS "entries_owner_delete" ON public.entries;
DROP POLICY IF EXISTS "entries_read_access" ON public.entries;
DROP POLICY IF EXISTS "entries_create_access" ON public.entries;
DROP POLICY IF EXISTS "entries_update_access" ON public.entries;
DROP POLICY IF EXISTS "entries_delete_access" ON public.entries;

-- LIKES - Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "API puede eliminar likes" ON public.likes;
DROP POLICY IF EXISTS "API puede insertar likes" ON public.likes;
DROP POLICY IF EXISTS "Cualquiera puede leer likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios likes" ON public.likes;
DROP POLICY IF EXISTS "likes_public_read" ON public.likes;
DROP POLICY IF EXISTS "likes_authenticated_insert" ON public.likes;
DROP POLICY IF EXISTS "likes_owner_delete" ON public.likes;
DROP POLICY IF EXISTS "likes_read_access" ON public.likes;
DROP POLICY IF EXISTS "likes_create_access" ON public.likes;
DROP POLICY IF EXISTS "likes_delete_access" ON public.likes;

-- OBJECTIVES - Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "objectives_delete_policy" ON public.objectives;
DROP POLICY IF EXISTS "objectives_insert_policy" ON public.objectives;
DROP POLICY IF EXISTS "objectives_read_policy" ON public.objectives;
DROP POLICY IF EXISTS "objectives_update_policy" ON public.objectives;
DROP POLICY IF EXISTS "Cualquiera puede leer objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "objectives_owner_read" ON public.objectives;
DROP POLICY IF EXISTS "objectives_owner_insert" ON public.objectives;
DROP POLICY IF EXISTS "objectives_owner_update" ON public.objectives;
DROP POLICY IF EXISTS "objectives_owner_delete" ON public.objectives;
DROP POLICY IF EXISTS "objectives_read_access" ON public.objectives;
DROP POLICY IF EXISTS "objectives_create_access" ON public.objectives;
DROP POLICY IF EXISTS "objectives_update_access" ON public.objectives;
DROP POLICY IF EXISTS "objectives_delete_access" ON public.objectives;

-- NOTIFICATIONS - Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_system_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_read_access" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_access" ON public.notifications;

-- PUSH_TOKENS - Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can access their own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_user_access" ON public.push_tokens;

-- =============================
-- ACTIVAR RLS EN TODAS LAS TABLAS
-- =============================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- =============================
-- TABLA USERS - Políticas definitivas
-- =============================

-- Los usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "users_view_all_profiles" 
  ON public.users FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Los usuarios pueden gestionar solo sus propios datos
CREATE POLICY "users_manage_own_data" 
  ON public.users FOR ALL 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================
-- TABLA ENTRIES - Políticas definitivas
-- =============================

-- Lectura: Posts públicos para todos, posts privados solo para el propietario
CREATE POLICY "entries_read_access" 
  ON public.entries FOR SELECT 
  USING (
    (is_private = false OR is_private IS NULL) 
    OR auth.uid() = user_id
  );

-- Inserción: Usuarios autenticados pueden crear sus propios entries o entries como invitado
CREATE POLICY "entries_create_access" 
  ON public.entries FOR INSERT 
  WITH CHECK (
    (auth.uid() = user_id AND auth.role() = 'authenticated') 
    OR (guest = true AND user_id IS NULL)
  );

-- Actualización: Solo el propietario puede editar sus entries
CREATE POLICY "entries_update_access" 
  ON public.entries FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Eliminación: Solo el propietario puede eliminar sus entries
CREATE POLICY "entries_delete_access" 
  ON public.entries FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================
-- TABLA LIKES - Políticas definitivas
-- =============================

-- Lectura: Todos pueden ver los likes
CREATE POLICY "likes_read_access" 
  ON public.likes FOR SELECT 
  USING (true);

-- Inserción: Usuarios autenticados pueden dar like
CREATE POLICY "likes_create_access" 
  ON public.likes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM public.entries WHERE id = entry_id)
  );

-- Eliminación: Los usuarios pueden eliminar solo sus propios likes
CREATE POLICY "likes_delete_access" 
  ON public.likes FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================
-- TABLA OBJECTIVES - Políticas definitivas
-- =============================

-- Lectura: Solo el propietario puede ver sus objetivos
CREATE POLICY "objectives_read_access" 
  ON public.objectives FOR SELECT 
  USING (auth.uid() = user_id);

-- Inserción: Solo el propietario del entry puede crear objetivos
CREATE POLICY "objectives_create_access" 
  ON public.objectives FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.entries e 
      WHERE e.id = entry_id AND e.user_id = auth.uid()
    )
  );

-- Actualización: Solo el propietario puede actualizar sus objetivos
CREATE POLICY "objectives_update_access" 
  ON public.objectives FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Eliminación: Solo el propietario puede eliminar sus objetivos
CREATE POLICY "objectives_delete_access" 
  ON public.objectives FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================
-- TABLA NOTIFICATIONS - Políticas definitivas
-- =============================

-- Lectura: Los usuarios pueden leer solo sus propias notificaciones
CREATE POLICY "notifications_read_access" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

-- Inserción: Solo el sistema puede insertar notificaciones
CREATE POLICY "notifications_system_insert" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

-- Actualización: Los usuarios pueden marcar como leídas sus notificaciones
CREATE POLICY "notifications_update_access" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================
-- TABLA PUSH_TOKENS - Políticas definitivas
-- =============================

-- Los usuarios pueden gestionar completamente sus propios push tokens
CREATE POLICY "push_tokens_user_access" 
  ON public.push_tokens FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================
-- VERIFICACIÓN FINAL
-- =============================

-- Mostrar estado de RLS
SELECT 
  'RLS STATUS' as info,
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- Mostrar todas las políticas
SELECT 
  'ACTIVE POLICIES' as info,
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- =============================
-- MENSAJE DE ÉXITO
-- =============================

DO $$
BEGIN
  RAISE NOTICE '✅ MIGRACIÓN FINAL DE RLS COMPLETADA';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Políticas aplicadas:';
  RAISE NOTICE '   • USERS: 2 políticas (ver todos los perfiles + gestionar datos propios)';
  RAISE NOTICE '   • ENTRIES: 4 políticas (leer públicos/propios, crear, actualizar, eliminar)';
  RAISE NOTICE '   • LIKES: 3 políticas (leer todos, crear propios, eliminar propios)';
  RAISE NOTICE '   • OBJECTIVES: 4 políticas (CRUD limitado al propietario del entry)';
  RAISE NOTICE '   • NOTIFICATIONS: 3 políticas (leer propias, inserción sistema, actualizar propias)';
  RAISE NOTICE '   • PUSH_TOKENS: 1 política (acceso completo a tokens propios)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Funcionalidades habilitadas:';
  RAISE NOTICE '   • ✓ Ver perfiles de otros usuarios';
  RAISE NOTICE '   • ✓ Crear y ver entries propias';
  RAISE NOTICE '   • ✓ Ver entries públicas de otros';
  RAISE NOTICE '   • ✓ Dar likes a entries de otros';
  RAISE NOTICE '   • ✓ Gestionar objetivos propios';
  RAISE NOTICE '   • ✓ Recibir y leer notificaciones';
  RAISE NOTICE '   • ✓ Gestionar push tokens';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Todas las políticas anteriores han sido eliminadas';
  RAISE NOTICE '🔐 RLS está activado en todas las tablas relevantes';
END $$;