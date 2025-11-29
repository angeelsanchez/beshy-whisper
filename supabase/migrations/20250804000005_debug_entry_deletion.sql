-- ===================================================================
-- DIAGNÓSTICO DE PROBLEMAS DE ELIMINACIÓN DE ENTRIES
-- Investiga por qué fallan las eliminaciones después de desactivar RLS
-- ===================================================================

-- =============================
-- VERIFICAR FOREIGN KEY CONSTRAINTS
-- =============================

-- Mostrar todas las foreign keys que apuntan a entries
SELECT 
  'FOREIGN KEY CONSTRAINTS' as info,
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'entries'
  AND tc.table_schema = 'public';

-- =============================
-- VERIFICAR TRIGGERS EN ENTRIES
-- =============================

-- Mostrar todos los triggers en la tabla entries
SELECT 
  'ENTRY TRIGGERS' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'entries'
  AND event_object_schema = 'public';

-- =============================
-- FUNCIÓN DE ELIMINACIÓN SEGURA
-- =============================

-- Crear función que elimina entry y sus dependencias
CREATE OR REPLACE FUNCTION safe_delete_entry(entry_uuid UUID)
RETURNS TABLE (
  step TEXT,
  action TEXT,
  affected_rows INTEGER,
  success BOOLEAN,
  error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  likes_count INTEGER;
  objectives_count INTEGER;
  entry_exists BOOLEAN;
BEGIN
  -- Verificar si el entry existe
  SELECT EXISTS(SELECT 1 FROM public.entries WHERE id = entry_uuid) INTO entry_exists;
  
  IF NOT entry_exists THEN
    RETURN QUERY SELECT 'CHECK'::TEXT, 'Entry does not exist'::TEXT, 0, false, 'Entry not found'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 'CHECK'::TEXT, 'Entry exists'::TEXT, 1, true, ''::TEXT;
  
  -- Contar dependencias
  SELECT COUNT(*) INTO likes_count FROM public.likes WHERE entry_id = entry_uuid;
  SELECT COUNT(*) INTO objectives_count FROM public.objectives WHERE entry_id = entry_uuid;
  
  RETURN QUERY SELECT 'COUNT'::TEXT, 'Likes found'::TEXT, likes_count, true, ''::TEXT;
  RETURN QUERY SELECT 'COUNT'::TEXT, 'Objectives found'::TEXT, objectives_count, true, ''::TEXT;
  
  -- Eliminar likes primero
  BEGIN
    DELETE FROM public.likes WHERE entry_id = entry_uuid;
    GET DIAGNOSTICS likes_count = ROW_COUNT;
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Likes deleted'::TEXT, likes_count, true, ''::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Likes deletion failed'::TEXT, 0, false, SQLERRM::TEXT;
    RETURN;
  END;
  
  -- Eliminar objectives
  BEGIN
    DELETE FROM public.objectives WHERE entry_id = entry_uuid;
    GET DIAGNOSTICS objectives_count = ROW_COUNT;
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Objectives deleted'::TEXT, objectives_count, true, ''::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Objectives deletion failed'::TEXT, 0, false, SQLERRM::TEXT;
    RETURN;
  END;
  
  -- Finalmente eliminar el entry
  BEGIN
    DELETE FROM public.entries WHERE id = entry_uuid;
    GET DIAGNOSTICS likes_count = ROW_COUNT;
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Entry deleted'::TEXT, likes_count, true, ''::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Entry deletion failed'::TEXT, 0, false, SQLERRM::TEXT;
    RETURN;
  END;
  
END;
$$;

-- =============================
-- VERIFICAR CASCADE DELETES
-- =============================

-- Verificar si las FK tienen ON DELETE CASCADE
SELECT 
  'CASCADE CHECK' as info,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  rc.delete_rule,
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN '✅ Will auto-delete'
    WHEN 'RESTRICT' THEN '❌ Will block deletion'
    WHEN 'SET NULL' THEN '⚠️ Will set to NULL'
    ELSE '❓ ' || rc.delete_rule
  END as behavior
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'entries'
  AND tc.table_schema = 'public';

-- =============================
-- MENSAJE DE DIAGNÓSTICO
-- =============================

DO $$
BEGIN
  RAISE NOTICE '🔍 DIAGNÓSTICO DE ELIMINACIÓN DE ENTRIES';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Información recopilada:';
  RAISE NOTICE '   • Foreign keys que apuntan a entries';
  RAISE NOTICE '   • Triggers activos en entries';
  RAISE NOTICE '   • Comportamiento de CASCADE deletes';
  RAISE NOTICE '';
  RAISE NOTICE '🛠️ Función creada:';
  RAISE NOTICE '   SELECT * FROM safe_delete_entry(''uuid-del-entry'');';
  RAISE NOTICE '   (Reemplaza uuid-del-entry con el ID real)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos pasos:';
  RAISE NOTICE '   1. Revisar si hay foreign keys SIN cascade';
  RAISE NOTICE '   2. Verificar si hay triggers que bloquean eliminación';
  RAISE NOTICE '   3. Probar eliminación con la función safe_delete_entry()';
END $$;