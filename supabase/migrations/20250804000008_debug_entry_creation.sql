-- ===================================================================
-- DIAGNÓSTICO: ¿Por qué no se crean los entries desde el frontend?
-- ===================================================================

-- =============================
-- VERIFICAR ESTADO ACTUAL DE RLS EN ENTRIES
-- =============================

SELECT 
  'ENTRIES RLS STATUS' as info,
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ENABLED - Puede bloquear inserts'
    ELSE '🔓 RLS DISABLED - Inserts deberían funcionar'
  END as status
FROM pg_tables 
WHERE tablename = 'entries' 
  AND schemaname = 'public';

-- =============================
-- VERIFICAR POLÍTICAS DE INSERT EN ENTRIES
-- =============================

SELECT 
  'ENTRIES INSERT POLICIES' as info,
  policyname, 
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'entries' 
  AND schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- =============================
-- VERIFICAR CONTEXTO JWT PARA INSERTS
-- =============================

SELECT 
  'JWT INSERT TEST' as info,
  auth.uid() as user_id,
  auth.role() as role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ auth.uid() NULL - INSERT fallará'
    WHEN auth.role() = 'authenticated' THEN '✅ Authenticated role - INSERT debería funcionar'
    ELSE '⚠️ Role: ' || COALESCE(auth.role(), 'NULL')
  END as insert_status;

-- =============================
-- FUNCIÓN DE PRUEBA DE INSERT DE ENTRY
-- =============================

CREATE OR REPLACE FUNCTION test_entry_insert(test_user_id UUID, test_message TEXT)
RETURNS TABLE (
  step TEXT,
  result TEXT,
  success BOOLEAN,
  entry_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_entry_id UUID;
  test_name TEXT := 'Test User';
  test_ip TEXT := '192.168.1.1';
  test_franja TEXT := 'DIA';
BEGIN
  -- Test 1: Verificar contexto
  RETURN QUERY SELECT 
    'AUTH_CHECK'::TEXT,
    format('auth.uid()=%s, auth.role()=%s', auth.uid(), auth.role())::TEXT,
    (auth.uid() IS NOT NULL)::BOOLEAN,
    NULL::UUID;
  
  -- Test 2: Intentar insert directo
  BEGIN
    INSERT INTO public.entries (user_id, nombre, mensaje, fecha, ip, franja, guest, is_private)
    VALUES (test_user_id, test_name, test_message, NOW(), test_ip, test_franja, false, false)
    RETURNING id INTO new_entry_id;
    
    RETURN QUERY SELECT 
      'INSERT_SUCCESS'::TEXT,
      format('Entry created with ID: %s', new_entry_id)::TEXT,
      true,
      new_entry_id;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'INSERT_FAILED'::TEXT,
      format('INSERT failed: %s', SQLERRM)::TEXT,
      false,
      NULL::UUID;
  END;
  
END;
$$;

-- =============================
-- MENSAJE DE DIAGNÓSTICO
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🔍 DIAGNÓSTICO DE CREACIÓN DE ENTRIES';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Verificaciones realizadas:';
  RAISE NOTICE '   • Estado de RLS en tabla entries';
  RAISE NOTICE '   • Políticas de INSERT activas';
  RAISE NOTICE '   • Contexto JWT disponible';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Para probar insert:';
  RAISE NOTICE '   SELECT * FROM test_entry_insert(''user-uuid'', ''Mensaje de prueba'');';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Si el INSERT falla:';
  RAISE NOTICE '   • RLS está bloqueando la inserción';
  RAISE NOTICE '   • auth.uid() es NULL o no coincide';
  RAISE NOTICE '   • Las políticas son demasiado restrictivas';
END $$;