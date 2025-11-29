-- ===================================================================
-- DIAGNÓSTICO ESPECÍFICO: PROBLEMAS DE NOTIFICACIONES
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
  COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as users_with_id,
  COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as recent_users
FROM public.users;

-- Verificar que hay push tokens válidos
SELECT 
  '📱 VERIFICACIÓN DE PUSH TOKENS' as info,
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as tokens_with_user_id,
  COUNT(CASE WHEN endpoint IS NOT NULL THEN 1 END) as tokens_with_endpoint,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as recent_tokens
FROM public.push_tokens;

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
-- PASO 6: SIMULAR EL FLUJO DE NOTIFICACIONES
-- =============================

-- Crear un test de simulación para identificar el punto exacto de fallo
DO $$
DECLARE
  test_result TEXT;
BEGIN
  RAISE NOTICE '🧪 SIMULANDO FLUJO DE NOTIFICACIONES...';
  
  -- Test 1: Verificar que podemos acceder a entries
  BEGIN
    RAISE NOTICE '✅ Test 1: Acceso a entries - OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 1: Error accediendo a entries - %', SQLERRM;
  END;
  
  -- Test 2: Verificar que podemos acceder a users
  BEGIN
    RAISE NOTICE '✅ Test 2: Acceso a users - OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 2: Error accediendo a users - %', SQLERRM;
  END;
  
  -- Test 3: Verificar que podemos acceder a push_tokens
  BEGIN
    RAISE NOTICE '✅ Test 3: Acceso a push_tokens - OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 3: Error accediendo a push_tokens - %', SQLERRM;
  END;
  
  -- Test 4: Verificar que podemos acceder a likes
  BEGIN
    RAISE NOTICE '✅ Test 4: Acceso a likes - OK';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test 4: Error accediendo a likes - %', SQLERRM;
  END;
  
  RAISE NOTICE '🎯 Simulación completada';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error en simulación: %', SQLERRM;
END $$;

-- =============================
-- PASO 7: IDENTIFICAR PROBLEMAS ESPECÍFICOS
-- =============================

-- Buscar posibles problemas en las políticas
SELECT 
  '🔍 PROBLEMAS IDENTIFICADOS' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'likes' 
      AND policyname = 'likes_create_access'
      AND with_check LIKE '%auth.uid() = user_id%'
    ) THEN '✅ Política de likes correcta'
    ELSE '❌ Política de likes problemática'
  END as likes_policy_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'entries' 
      AND policyname = 'entries_read_permissive'
      AND cmd = 'SELECT'
    ) THEN '✅ Política de entries correcta'
    ELSE '❌ Política de entries problemática'
  END as entries_policy_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'users' 
      AND policyname = 'users_view_all_profiles'
      AND cmd = 'SELECT'
    ) THEN '✅ Política de users correcta'
    ELSE '❌ Política de users problemática'
  END as users_policy_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'push_tokens' 
      AND policyname = 'push_tokens_user_access'
      AND cmd = 'ALL'
    ) THEN '✅ Política de push_tokens correcta'
    ELSE '❌ Política de push_tokens problemática'
  END as push_tokens_policy_status;

-- =============================
-- RESUMEN DEL DIAGNÓSTICO
-- =============================

SELECT 
  '🎯 RESUMEN DEL DIAGNÓSTICO' as info,
  'Si todos los tests muestran ✅, el problema no está en RLS' as conclusion,
  'Revisar logs de la aplicación para más detalles' as next_step,
  'Verificar configuración de VAPID keys' as recommendation; 