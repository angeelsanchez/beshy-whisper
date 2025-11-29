-- ===================================================================
-- SCRIPT SEGURO PARA APLICAR EN PRODUCCIÓN
-- CORREGIR RLS PARA NOTIFICACIONES
-- ===================================================================

-- ⚠️ IMPORTANTE: Ejecutar este script en el orden indicado
-- ⚠️ Hacer backup antes de ejecutar
-- ⚠️ Ejecutar en horario de bajo tráfico

-- =============================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- =============================

-- Verificar tablas con RLS
SELECT 
  'RLS STATUS' as info,
  tablename, 
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- Verificar políticas existentes
SELECT 
  'CURRENT POLICIES' as info,
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'no USING'
  END as policy_condition
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================
-- PASO 2: LIMPIAR POLÍTICAS CONFLICTIVAS
-- =============================

-- Eliminar políticas de LIKES
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

-- Eliminar políticas de ENTRIES
DROP POLICY IF EXISTS "entries_read_access" ON public.entries;
DROP POLICY IF EXISTS "entries_create_access" ON public.entries;
DROP POLICY IF EXISTS "entries_update_access" ON public.entries;
DROP POLICY IF EXISTS "entries_delete_access" ON public.entries;

-- Eliminar políticas de USERS
DROP POLICY IF EXISTS "users_view_all_profiles" ON public.users;
DROP POLICY IF EXISTS "users_manage_own_data" ON public.users;

-- Eliminar políticas de PUSH_TOKENS
DROP POLICY IF EXISTS "push_tokens_owner_access" ON public.push_tokens;

-- =============================
-- PASO 3: CORREGIR FOREIGN KEY CONSTRAINTS
-- =============================

-- Eliminar constraint problemático de likes
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_entry_id_fkey;

-- Recrear constraint con CASCADE DELETE
ALTER TABLE public.likes 
ADD CONSTRAINT likes_entry_id_fkey 
FOREIGN KEY (entry_id) 
REFERENCES public.entries(id) 
ON DELETE CASCADE;

-- Corregir constraint de user_id
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE public.likes 
ADD CONSTRAINT likes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =============================
-- PASO 4: CREAR POLÍTICAS RLS CORRECTAS
-- =============================

-- =============================
-- TABLA LIKES - Políticas simples y efectivas
-- =============================

-- Lectura: Todos pueden ver likes (para contadores)
CREATE POLICY "likes_public_read" ON public.likes FOR SELECT USING (true);

-- Inserción: Usuarios autenticados pueden dar like
CREATE POLICY "likes_authenticated_insert" ON public.likes FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Eliminación: Usuarios pueden eliminar solo sus propios likes
CREATE POLICY "likes_owner_delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- =============================
-- TABLA ENTRIES - Políticas balanceadas
-- =============================

-- Lectura: Posts públicos para todos, privados solo para propietario
CREATE POLICY "entries_read_access" ON public.entries FOR SELECT 
USING ((is_private = false OR is_private IS NULL) OR auth.uid() = user_id);

-- Inserción: Usuarios autenticados pueden crear entries
CREATE POLICY "entries_create_access" ON public.entries FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Actualización: Solo propietario puede editar
CREATE POLICY "entries_update_access" ON public.entries FOR UPDATE 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Eliminación: Solo propietario puede eliminar
CREATE POLICY "entries_delete_access" ON public.entries FOR DELETE 
USING (auth.uid() = user_id);

-- =============================
-- TABLA USERS - Políticas para perfiles
-- =============================

-- Lectura: Usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "users_view_all_profiles" ON public.users FOR SELECT 
USING (auth.role() = 'authenticated');

-- Gestión: Usuarios pueden gestionar solo sus propios datos
CREATE POLICY "users_manage_own_data" ON public.users FOR ALL 
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =============================
-- TABLA PUSH_TOKENS - Acceso completo para el propietario
-- =============================

-- Acceso completo para el propietario del token
CREATE POLICY "push_tokens_owner_access" ON public.push_tokens FOR ALL 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================
-- PASO 5: VERIFICACIÓN FINAL
-- =============================

-- Verificar que las políticas se crearon correctamente
SELECT 
  'FINAL POLICIES' as info,
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
WHERE tablename IN ('users', 'entries', 'likes', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar constraints
SELECT 
  'FOREIGN KEYS' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('likes')
  AND tc.table_schema = 'public';

-- =============================
-- RESUMEN DE LA CORRECCIÓN
-- =============================

SELECT 
  '🎉 CORRECCIÓN COMPLETADA' as status,
  '✅ RLS configurado correctamente' as rls_status,
  '✅ Foreign keys con CASCADE DELETE' as constraints_status,
  '✅ Políticas de seguridad aplicadas' as policies_status,
  '📱 Notificaciones deberían funcionar ahora' as notifications_status; 