-- ===================================================================
-- PRUEBA DE CONTEXTO JWT DESPUÉS DE CAMBIOS FRONTEND
-- Verifica si auth.uid() ahora funciona correctamente
-- ===================================================================

-- =============================
-- VERIFICAR CONTEXTO JWT ACTUAL
-- =============================

SELECT 
  'JWT STATUS AFTER FRONTEND FIX' as info,
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ auth.uid() still NULL'
    WHEN auth.role() IS NULL THEN '⚠️ auth.role() is NULL but uid exists'
    ELSE '✅ AUTH CONTEXT OK'
  END as auth_status;

-- Verificar información adicional de JWT
SELECT 
  'JWT DETAILS' as info,
  current_setting('request.jwt.claims', true) as jwt_claims,
  current_setting('request.headers', true) as headers,
  auth.jwt() as full_jwt;

-- =============================
-- FUNCIÓN PARA PROBAR RLS CON AUTH
-- =============================

CREATE OR REPLACE FUNCTION test_rls_with_auth()
RETURNS TABLE (
  test_name TEXT,
  auth_uid UUID,
  auth_role TEXT,
  can_access_entries BOOLEAN,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_entry_count INTEGER;
BEGIN
  -- Test 1: Verificar contexto de auth
  RETURN QUERY SELECT 
    'AUTH_CONTEXT'::TEXT,
    auth.uid(),
    auth.role(),
    (auth.uid() IS NOT NULL)::BOOLEAN,
    CASE 
      WHEN auth.uid() IS NULL THEN 'auth.uid() is NULL'
      ELSE 'auth.uid() is available'
    END::TEXT;
  
  -- Test 2: Probar acceso a entries (RLS desactivado actualmente)
  BEGIN
    SELECT COUNT(*) INTO test_entry_count FROM public.entries LIMIT 5;
    RETURN QUERY SELECT 
      'ENTRIES_ACCESS'::TEXT,
      auth.uid(),
      auth.role(),
      true,
      format('Can read %s entries', test_entry_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'ENTRIES_ACCESS'::TEXT,
      auth.uid(),
      auth.role(),
      false,
      SQLERRM::TEXT;
  END;
  
END;
$$;

-- =============================
-- MENSAJE INFORMATIVO
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🧪 PRUEBA DE JWT DESPUÉS DE CAMBIOS FRONTEND';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Cambios realizados en frontend:';
  RAISE NOTICE '   • persistSession: true (era false)';
  RAISE NOTICE '   • Removido custom fetch temporalmente';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Para probar el contexto JWT:';
  RAISE NOTICE '   SELECT * FROM test_rls_with_auth();';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Si auth.uid() funciona ahora:';
  RAISE NOTICE '   • Podremos reactivar RLS en entries';
  RAISE NOTICE '   • Las políticas funcionarán correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Si sigue NULL:';
  RAISE NOTICE '   • Verificar que el usuario esté logueado';
  RAISE NOTICE '   • Revisar configuración de variables de entorno';
  RAISE NOTICE '   • Considerar usar service role key para operaciones específicas';
END $$;