-- ===================================================================
-- SCRIPT DE VERIFICACIÓN: NOTIFICACIONES FUNCIONANDO
-- Ejecutar DESPUÉS de aplicar la corrección RLS
-- ===================================================================

-- =============================
-- PASO 1: VERIFICAR ESTADO DE RLS
-- =============================

SELECT 
  '🔍 VERIFICACIÓN RLS' as info,
  tablename, 
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- =============================
-- PASO 2: VERIFICAR POLÍTICAS ACTIVAS
-- =============================

SELECT 
  '🔐 POLÍTICAS ACTIVAS' as info,
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

-- =============================
-- PASO 3: VERIFICAR CONSTRAINTS
-- =============================

SELECT 
  '🔗 FOREIGN KEYS' as info,
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
-- PASO 4: VERIFICAR DATOS DE PRUEBA
-- =============================

-- Verificar que hay usuarios
SELECT 
  '👥 USUARIOS' as info,
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as users_last_7_days
FROM public.users;

-- Verificar que hay entries
SELECT 
  '📝 ENTRIES' as info,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as entries_last_7_days,
  COUNT(CASE WHEN franja = 'DIA' THEN 1 END) as day_entries,
  COUNT(CASE WHEN franja = 'NOCHE' THEN 1 END) as night_entries
FROM public.entries;

-- Verificar que hay likes
SELECT 
  '❤️ LIKES' as info,
  COUNT(*) as total_likes,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as likes_last_7_days
FROM public.likes;

-- Verificar que hay push tokens
SELECT 
  '📱 PUSH TOKENS' as info,
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as tokens_last_7_days
FROM public.push_tokens;

-- =============================
-- PASO 5: VERIFICAR PERMISOS DE USUARIOS
-- =============================

-- Verificar que los usuarios autenticados pueden leer entries
SELECT 
  '🔓 PERMISOS DE LECTURA' as info,
  'Usuarios autenticados pueden leer entries públicos' as permission,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'entries' 
      AND cmd = 'SELECT' 
      AND (qual LIKE '%is_private%' OR qual LIKE '%auth.uid%')
    ) THEN '✅ CONFIGURADO'
    ELSE '❌ NO CONFIGURADO'
  END as status;

-- Verificar que los usuarios autenticados pueden insertar likes
SELECT 
  '🔓 PERMISOS DE LIKES' as info,
  'Usuarios autenticados pueden insertar likes' as permission,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'likes' 
      AND cmd = 'INSERT' 
      AND with_check LIKE '%auth.uid%'
    ) THEN '✅ CONFIGURADO'
    ELSE '❌ NO CONFIGURADO'
  END as status;

-- =============================
-- PASO 6: VERIFICAR FUNCIONES CRÍTICAS
-- =============================

-- Verificar que las funciones de likes existen
SELECT 
  '⚙️ FUNCIONES' as info,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE'
  END as status
FROM information_schema.routines 
WHERE routine_name IN ('add_like', 'remove_like', 'check_like_status')
  AND routine_schema = 'public';

-- =============================
-- RESUMEN DE VERIFICACIÓN
-- =============================

SELECT 
  '🎯 RESUMEN DE VERIFICACIÓN' as info,
  'Si todas las verificaciones muestran ✅, las notificaciones deberían funcionar' as message,
  'Ejecutar el script de corrección si hay ❌' as action,
  'Probar con un like real después de la corrección' as next_step; 