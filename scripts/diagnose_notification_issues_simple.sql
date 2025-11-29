-- ===================================================================
-- DIAGNÓSTICO SIMPLIFICADO: PROBLEMAS DE NOTIFICACIONES
-- OBJETIVO: Identificar exactamente por qué no funcionan las notificaciones
-- ===================================================================

-- =============================
-- PASO 1: VERIFICAR ERRORES ESPECÍFICOS MENCIONADOS
-- =============================

SELECT 
  '🚨 DIAGNÓSTICO DE ERRORES REPORTADOS' as info,
  'Analizando los errores específicos del log' as description;

-- Error 1: "new row violates row-level security policy for table likes"
SELECT 
  'ERROR 1: RLS VIOLATION' as error_type,
  'new row violates row-level security policy for table likes' as error_message,
  'Problema: La política RLS está bloqueando la inserción de likes' as analysis,
  'Solución: Verificar que la política likes_create_access funcione correctamente' as solution;

-- Error 2: "insert or update on table likes violates foreign key constraint"
SELECT 
  'ERROR 2: FOREIGN KEY VIOLATION' as error_type,
  'insert or update on table likes violates foreign key constraint' as error_message,
  'Problema: El entry_id o user_id no existe en las tablas referenciadas' as analysis,
  'Solución: Verificar que los IDs sean válidos antes de insertar' as solution;

-- =============================
-- PASO 2: VERIFICAR DATOS REALES EN LAS TABLAS
-- =============================

-- Verificar que hay entries válidos
SELECT 
  '📝 VERIFICACIÓN DE ENTRIES' as info,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as entries_with_id,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as entries_with_user_id,
  COUNT(CASE WHEN fecha >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_entries
FROM public.entries;

-- Verificar que hay usuarios válidos
SELECT 
  '👥 VERIFICACIÓN DE USUARIOS' as info,
  COUNT(*) as total_users,
  COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as users_with_id
FROM public.users;

-- Verificar que hay push tokens válidos
SELECT 
  '📱 VERIFICACIÓN DE PUSH TOKENS' as info,
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as tokens_with_user_id,
  COUNT(CASE WHEN endpoint IS NOT NULL THEN 1 END) as tokens_with_endpoint
FROM public.push_tokens;

-- Verificar que hay likes válidos
SELECT 
  '❤️ VERIFICACIÓN DE LIKES' as info,
  COUNT(*) as total_likes,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as likes_with_user_id,
  COUNT(CASE WHEN entry_id IS NOT NULL THEN 1 END) as likes_with_entry_id
FROM public.likes;

-- =============================
-- PASO 3: VERIFICAR PERMISOS ESPECÍFICOS PARA NOTIFICACIONES
-- =============================

-- Verificar que el sistema puede acceder a los datos necesarios para notificaciones
SELECT 
  '🔓 VERIFICACIÓN DE PERMISOS PARA NOTIFICACIONES' as info,
  'Verificando acceso a datos críticos' as description;

-- Test 1: Verificar acceso a entries (necesario para obtener datos del post)
SELECT 
  'TEST 1: ACCESO A ENTRIES' as test_name,
  'entries_read_permissive' as policy_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'entries' 
      AND policyname = 'entries_read_permissive'
      AND cmd = 'SELECT'
    ) THEN '✅ POLÍTICA EXISTE'
    ELSE '❌ POLÍTICA NO EXISTE'
  END as policy_status,
  'Permite leer entries para obtener datos del post' as purpose;

-- Test 2: Verificar acceso a users (necesario para obtener datos del propietario)
SELECT 
  'TEST 2: ACCESO A USERS' as test_name,
  'users_view_all_profiles' as policy_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'users_view_all_profiles'
      AND cmd = 'SELECT'
    ) THEN '✅ POLÍTICA EXISTE'
    ELSE '❌ POLÍTICA NO EXISTE'
  END as policy_status,
  'Permite obtener información del usuario propietario' as purpose;

-- Test 3: Verificar acceso a push_tokens (necesario para enviar notificaciones)
SELECT 
  'TEST 3: ACCESO A PUSH_TOKENS' as test_name,
  'push_tokens_user_access' as policy_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'push_tokens' 
      AND policyname = 'push_tokens_user_access'
      AND cmd = 'ALL'
    ) THEN '✅ POLÍTICA EXISTE'
    ELSE '❌ POLÍTICA NO EXISTE'
  END as policy_status,
  'Permite gestionar tokens para enviar notificaciones' as purpose;

-- =============================
-- PASO 4: VERIFICAR FUNCIONAMIENTO DE LA POLÍTICA DE LIKES
-- =============================

-- Analizar la política de likes en detalle
SELECT 
  '🔍 ANÁLISIS DETALLADO DE POLÍTICA DE LIKES' as info,
  policyname,
  cmd,
  qual,
  with_check,
  CASE 
    WHEN with_check LIKE '%auth.uid() = user_id%' THEN '✅ Verifica usuario autenticado'
    ELSE '❌ No verifica usuario autenticado'
  END as auth_check,
  CASE 
    WHEN with_check LIKE '%auth.role() = authenticated%' THEN '✅ Verifica rol autenticado'
    ELSE '❌ No verifica rol autenticado'
  END as role_check,
  CASE 
    WHEN with_check LIKE '%EXISTS (SELECT 1 FROM entries%' THEN '✅ Verifica entry existe'
    ELSE '❌ No verifica entry existe'
  END as entry_check
FROM pg_policies 
WHERE tablename = 'likes' 
  AND policyname = 'likes_create_access'
  AND schemaname = 'public';

-- =============================
-- PASO 5: VERIFICAR CONSTRAINTS Y RELACIONES
-- =============================

-- Verificar foreign key constraints
SELECT 
  '🔗 VERIFICACIÓN DE FOREIGN KEYS' as info,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE DELETE'
    ELSE '⚠️ NO CASCADE DELETE'
  END as cascade_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('likes')
  AND tc.table_schema = 'public';

-- =============================
-- PASO 6: VERIFICAR DATOS ESPECÍFICOS MENCIONADOS EN EL ERROR
-- =============================

-- Verificar si el entry_id del error existe
SELECT 
  '🔍 VERIFICACIÓN DE ENTRY DEL ERROR' as info,
  'd2f7ea48-2618-4771-8a11-25b969626670' as entry_id_error,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.entries WHERE id = 'd2f7ea48-2618-4771-8a11-25b969626670') 
    THEN '✅ ENTRY EXISTE'
    ELSE '❌ ENTRY NO EXISTE'
  END as entry_status;

-- Verificar si el user_id del error existe
SELECT 
  '🔍 VERIFICACIÓN DE USER DEL ERROR' as info,
  'b27c6ef2-5537-4a30-be72-2d2840be885d' as user_id_error,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE id = 'b27c6ef2-5537-4a30-be72-2d2840be885d') 
    THEN '✅ USER EXISTE'
    ELSE '❌ USER NO EXISTE'
  END as user_status;

-- =============================
-- PASO 7: VERIFICAR ESTRUCTURA DE TABLAS
-- =============================

-- Verificar columnas de la tabla entries
SELECT 
  '📋 ESTRUCTURA DE ENTRIES' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'entries' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar columnas de la tabla users
SELECT 
  '📋 ESTRUCTURA DE USERS' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar columnas de la tabla likes
SELECT 
  '📋 ESTRUCTURA DE LIKES' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'likes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================
-- RESUMEN DEL DIAGNÓSTICO
-- =============================

SELECT 
  '🎯 RESUMEN DEL DIAGNÓSTICO' as info,
  'Si todos los tests muestran ✅, el problema no está en RLS' as conclusion,
  'Revisar logs de la aplicación para más detalles' as next_step,
  'Verificar configuración de VAPID keys' as recommendation; 