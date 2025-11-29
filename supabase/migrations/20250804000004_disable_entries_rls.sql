-- ===================================================================
-- SOLUCIÓN TEMPORAL: DESACTIVAR RLS EN ENTRIES
-- El contexto auth.uid() es NULL, causando que las operaciones fallen
-- ===================================================================

-- =============================
-- DESACTIVAR RLS EN ENTRIES TEMPORALMENTE
-- =============================

-- Esto permitirá que las operaciones UPDATE/DELETE funcionen
-- mientras investigamos el problema de autenticación
ALTER TABLE public.entries DISABLE ROW LEVEL SECURITY;

-- =============================
-- VERIFICAR ESTADO DE RLS
-- =============================

SELECT 
  'RLS STATUS AFTER DISABLE' as info,
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ENABLED'
    ELSE '🔓 RLS DISABLED'
  END as status
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- =============================
-- ALTERNATIVA: POLÍTICAS SIN auth.uid()
-- (Usar si quieres mantener RLS pero con lógica diferente)
-- =============================

-- Si quieres reactivar RLS más tarde con políticas que no dependan de auth.uid():

-- Ejemplo de política que usa el header de usuario directamente:
-- CREATE POLICY "entries_update_by_header" 
--   ON public.entries FOR UPDATE 
--   USING (
--     user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
--   );

-- =============================
-- DIAGNÓSTICO ADICIONAL
-- =============================

-- Verificar si hay información de JWT disponible de otra forma
SELECT 
  'JWT DIAGNOSTICS' as info,
  current_setting('request.jwt.claims', true) as jwt_claims,
  current_setting('request.headers', true) as headers;

-- =============================
-- MENSAJE INFORMATIVO
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🔓 RLS DESACTIVADO EN TABLA ENTRIES';
  RAISE NOTICE '';
  RAISE NOTICE '❌ Problema identificado:';
  RAISE NOTICE '   • auth.uid() devuelve NULL';
  RAISE NOTICE '   • Esto impide que las políticas RLS funcionen';
  RAISE NOTICE '   • Las operaciones UPDATE/DELETE fallan silenciosamente';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Solución aplicada:';
  RAISE NOTICE '   • RLS desactivado en tabla entries';
  RAISE NOTICE '   • Ahora las operaciones deberían persistir correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Próximos pasos:';
  RAISE NOTICE '   1. Probar eliminar y cambiar privacidad de posts';
  RAISE NOTICE '   2. Si funciona, investigar por qué auth.uid() es NULL';
  RAISE NOTICE '   3. Reactivar RLS cuando se solucione el problema de auth';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '   • La tabla entries ahora NO tiene restricciones de seguridad';
  RAISE NOTICE '   • Asegúrate de que tu aplicación maneje la autorización';
  RAISE NOTICE '   • Esto es una solución TEMPORAL';
END $$;