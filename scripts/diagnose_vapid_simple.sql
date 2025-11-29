-- ===================================================================
-- DIAGNÓSTICO SIMPLIFICADO: VAPID KEYS Y SERVICE WORKER
-- OBJETIVO: Verificar configuración de notificaciones push
-- ===================================================================

-- =============================
-- PASO 1: VERIFICAR CONFIGURACIÓN DE VAPID
-- =============================

SELECT 
  '🔑 DIAGNÓSTICO DE VAPID KEYS' as info,
  'Verificando configuración de notificaciones push' as description;

-- Verificar que hay push tokens registrados
SELECT 
  '📱 PUSH TOKENS REGISTRADOS' as info,
  COUNT(*) as total_tokens,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as tokens_with_user_id,
  COUNT(CASE WHEN endpoint IS NOT NULL THEN 1 END) as tokens_with_endpoint,
  COUNT(CASE WHEN p256dh IS NOT NULL THEN 1 END) as tokens_with_p256dh,
  COUNT(CASE WHEN auth IS NOT NULL THEN 1 END) as tokens_with_auth
FROM public.push_tokens;

-- =============================
-- PASO 2: VERIFICAR ESTRUCTURA DE PUSH_TOKENS
-- =============================

-- Verificar qué columnas tiene la tabla push_tokens
SELECT 
  '📋 ESTRUCTURA DE PUSH_TOKENS' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'push_tokens' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================
-- PASO 3: VERIFICAR USUARIOS CON TOKENS
-- =============================

-- Verificar qué usuarios tienen tokens registrados
SELECT 
  '👥 USUARIOS CON TOKENS' as info,
  u.id as user_id,
  u.name,
  u.bsy_id,
  COUNT(pt.id) as token_count,
  CASE 
    WHEN COUNT(pt.id) > 0 THEN '✅ TIENE TOKENS'
    ELSE '❌ SIN TOKENS'
  END as token_status
FROM public.users u
LEFT JOIN public.push_tokens pt ON u.id = pt.user_id
GROUP BY u.id, u.name, u.bsy_id
ORDER BY token_count DESC, u.name;

-- =============================
-- PASO 4: VERIFICAR CALIDAD DE TOKENS (SIMPLIFICADO)
-- =============================

-- Verificar tokens completos vs incompletos
SELECT 
  '🔍 CALIDAD DE TOKENS' as info,
  'Tokens completos (endpoint + p256dh + auth)' as description,
  COUNT(*) as token_count
FROM public.push_tokens
WHERE endpoint IS NOT NULL 
  AND p256dh IS NOT NULL 
  AND auth IS NOT NULL;

SELECT 
  '🔍 CALIDAD DE TOKENS' as info,
  'Tokens incompletos (falta p256dh o auth)' as description,
  COUNT(*) as token_count
FROM public.push_tokens
WHERE endpoint IS NOT NULL 
  AND (p256dh IS NULL OR auth IS NULL);

SELECT 
  '🔍 CALIDAD DE TOKENS' as info,
  'Tokens inválidos (sin endpoint)' as description,
  COUNT(*) as token_count
FROM public.push_tokens
WHERE endpoint IS NULL;

-- =============================
-- PASO 5: VERIFICAR INTEGRIDAD DE DATOS
-- =============================

-- Verificar que no hay tokens huérfanos
SELECT 
  '🔗 INTEGRIDAD DE DATOS' as info,
  'Tokens sin usuario válido' as check_type,
  COUNT(*) as orphaned_tokens
FROM public.push_tokens pt
LEFT JOIN public.users u ON pt.user_id = u.id
WHERE u.id IS NULL;

-- Verificar que no hay usuarios con tokens duplicados
SELECT 
  '🔗 INTEGRIDAD DE DATOS' as info,
  'Usuarios con múltiples tokens' as check_type,
  COUNT(*) as users_with_multiple_tokens
FROM (
  SELECT user_id, COUNT(*) as token_count
  FROM public.push_tokens
  WHERE user_id IS NOT NULL
  GROUP BY user_id
  HAVING COUNT(*) > 1
) duplicates;

-- =============================
-- PASO 6: VERIFICAR CONFIGURACIÓN DE NOTIFICACIONES
-- =============================

-- Verificar si hay notificaciones en la base de datos
SELECT 
  '🔔 VERIFICACIÓN DE NOTIFICACIONES' as info,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as notifications_with_user
FROM public.notifications;

-- =============================
-- PASO 7: RECOMENDACIONES ESPECÍFICAS
-- =============================

-- Generar recomendaciones basadas en los datos
SELECT 
  '💡 RECOMENDACIONES' as info,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.push_tokens WHERE endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL) = 0 THEN '❌ NO HAY TOKENS VÁLIDOS - Verificar registro de service worker'
    WHEN (SELECT COUNT(*) FROM public.push_tokens WHERE endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL) < 5 THEN '⚠️ POCOS TOKENS VÁLIDOS - Verificar permisos de notificaciones'
    ELSE '✅ TOKENS VÁLIDOS DETECTADOS - Verificar configuración de VAPID en la aplicación'
  END as recommendation;

SELECT 
  '💡 RECOMENDACIONES' as info,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.push_tokens WHERE user_id IS NULL) > 0 THEN '⚠️ LIMPIAR TOKENS HUÉRFANOS'
    ELSE '✅ TOKENS SIN HUÉRFANOS'
  END as cleanup_needed;

-- =============================
-- RESUMEN DEL DIAGNÓSTICO VAPID
-- =============================

SELECT 
  '🎯 RESUMEN DEL DIAGNÓSTICO VAPID' as info,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.push_tokens WHERE endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL) > 0 THEN '✅ TOKENS VÁLIDOS DETECTADOS'
    ELSE '❌ NO HAY TOKENS VÁLIDOS'
  END as token_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.push_tokens WHERE user_id IS NOT NULL) > 0 THEN '✅ USUARIOS CON TOKENS'
    ELSE '❌ NINGÚN USUARIO TIENE TOKENS'
  END as user_status,
  'Verificar configuración de VAPID en .env y service worker' as next_step; 