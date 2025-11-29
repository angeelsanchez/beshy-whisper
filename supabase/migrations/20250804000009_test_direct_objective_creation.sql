-- ===================================================================
-- PRUEBA DIRECTA: ¿Se pueden crear objectives usando supabaseAdmin?
-- ===================================================================

-- =============================
-- INSERTAR UN ENTRY DE PRUEBA DIRECTAMENTE
-- =============================

-- Insertar entry de prueba
INSERT INTO public.entries (
  id,
  user_id, 
  nombre, 
  mensaje, 
  fecha, 
  ip, 
  franja, 
  guest, 
  is_private
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.users LIMIT 1), -- Usar el primer usuario disponible
  'Test User',
  'Entry de prueba para objectives',
  NOW(),
  '127.0.0.1',
  'DIA',
  false,
  false
);

-- =============================
-- INSERTAR OBJECTIVES DE PRUEBA DIRECTAMENTE
-- =============================

-- Insertar objectives de prueba
INSERT INTO public.objectives (
  entry_id,
  user_id,
  text,
  done,
  created_at,
  updated_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.users LIMIT 1),
  'Objetivo de prueba 1',
  false,
  NOW(),
  NOW()
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.users LIMIT 1),
  'Objetivo de prueba 2',
  false,
  NOW(),
  NOW()
);

-- =============================
-- VERIFICAR QUE SE CREARON CORRECTAMENTE
-- =============================

-- Verificar el entry
SELECT 
  'TEST ENTRY' as info,
  id,
  user_id,
  nombre,
  mensaje,
  franja,
  fecha
FROM public.entries 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verificar los objectives
SELECT 
  'TEST OBJECTIVES' as info,
  id,
  entry_id,
  user_id,
  text,
  done,
  created_at
FROM public.objectives 
WHERE entry_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at;

-- =============================
-- VERIFICAR ESTADO DE RLS EN OBJECTIVES
-- =============================

SELECT 
  'OBJECTIVES RLS STATUS' as info,
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ENABLED'
    ELSE '🔓 RLS DISABLED'
  END as status
FROM pg_tables 
WHERE tablename = 'objectives' 
  AND schemaname = 'public';

-- Ver políticas activas de objectives
SELECT 
  'OBJECTIVES POLICIES' as info,
  policyname, 
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'objectives' 
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =============================
-- LIMPIAR DATOS DE PRUEBA
-- =============================

-- Eliminar datos de prueba
DELETE FROM public.objectives WHERE entry_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.entries WHERE id = '00000000-0000-0000-0000-000000000001';

-- =============================
-- MENSAJE DE PRUEBA
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🧪 PRUEBA DIRECTA DE OBJECTIVES COMPLETADA';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Si viste datos en TEST ENTRY y TEST OBJECTIVES:';
  RAISE NOTICE '   • La base de datos puede crear objectives correctamente';
  RAISE NOTICE '   • El problema está en la API o en el frontend';
  RAISE NOTICE '';
  RAISE NOTICE '❌ Si no viste datos:';
  RAISE NOTICE '   • Hay un problema más fundamental en la BD';
  RAISE NOTICE '   • RLS puede estar bloqueando incluso inserts directos';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Próximos pasos de debug:';
  RAISE NOTICE '   1. Verificar logs de la API /api/posts/create';
  RAISE NOTICE '   2. Verificar que la API esté siendo llamada';
  RAISE NOTICE '   3. Revisar errores en consola del browser';
END $$;