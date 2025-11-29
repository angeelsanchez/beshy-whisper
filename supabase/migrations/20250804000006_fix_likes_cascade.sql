-- ===================================================================
-- SOLUCIÓN: AGREGAR CASCADE DELETE A LIKES
-- Permite eliminar entries aunque tengan likes
-- ===================================================================

-- =============================
-- ELIMINAR CONSTRAINT ACTUAL DE LIKES
-- =============================

-- Encontrar el nombre exacto del constraint
SELECT 
  'CURRENT LIKES CONSTRAINT' as info,
  constraint_name,
  table_name,
  column_name,
  foreign_table_name,
  foreign_column_name
FROM (
  SELECT 
    tc.constraint_name,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'likes'
    AND ccu.table_name = 'entries'
    AND tc.table_schema = 'public'
) AS fk_info;

-- Eliminar el constraint actual (sin CASCADE)
ALTER TABLE public.likes 
DROP CONSTRAINT IF EXISTS likes_entry_id_fkey;

-- =============================
-- CREAR NUEVO CONSTRAINT CON CASCADE
-- =============================

-- Agregar nueva foreign key con CASCADE DELETE
ALTER TABLE public.likes 
ADD CONSTRAINT likes_entry_id_fkey 
FOREIGN KEY (entry_id) 
REFERENCES public.entries(id) 
ON DELETE CASCADE;

-- =============================
-- VERIFICAR LA CORRECCIÓN
-- =============================

-- Verificar que el cascade esté aplicado
SELECT 
  'FIXED CASCADE CHECK' as info,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table,
  rc.delete_rule,
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN '✅ Will auto-delete'
    WHEN 'RESTRICT' THEN '❌ Will block deletion'
    WHEN 'SET NULL' THEN '⚠️ Will set to NULL'
    WHEN 'NO ACTION' THEN '❌ Will block deletion'
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
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =============================
-- FUNCIÓN DE PRUEBA DE ELIMINACIÓN
-- =============================

CREATE OR REPLACE FUNCTION test_entry_deletion(entry_uuid UUID)
RETURNS TABLE (
  step TEXT,
  result TEXT,
  success BOOLEAN
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
    RETURN QUERY SELECT 'CHECK'::TEXT, 'Entry does not exist'::TEXT, false;
    RETURN;
  END IF;
  
  -- Contar dependencias antes
  SELECT COUNT(*) INTO likes_count FROM public.likes WHERE entry_id = entry_uuid;
  SELECT COUNT(*) INTO objectives_count FROM public.objectives WHERE entry_id = entry_uuid;
  
  RETURN QUERY SELECT 'COUNT'::TEXT, format('Entry has %s likes and %s objectives', likes_count, objectives_count)::TEXT, true;
  
  -- Intentar eliminar el entry (debe eliminar likes automáticamente por CASCADE)
  BEGIN
    DELETE FROM public.entries WHERE id = entry_uuid;
    RETURN QUERY SELECT 'DELETE'::TEXT, 'Entry deleted successfully (likes auto-deleted by CASCADE)'::TEXT, true;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'DELETE'::TEXT, format('Deletion failed: %s', SQLERRM)::TEXT, false;
  END;
  
END;
$$;

-- =============================
-- MENSAJE DE CORRECCIÓN
-- =============================

DO $$
BEGIN
  RAISE NOTICE '✅ CORRECCIÓN DE CASCADE DELETE APLICADA';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Cambios realizados:';
  RAISE NOTICE '   • Eliminado constraint likes_entry_id_fkey sin CASCADE';
  RAISE NOTICE '   • Agregado nuevo constraint con ON DELETE CASCADE';
  RAISE NOTICE '   • Ahora los likes se eliminan automáticamente';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Para probar la eliminación:';
  RAISE NOTICE '   SELECT * FROM test_entry_deletion(''uuid-del-entry'');';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Problema solucionado:';
  RAISE NOTICE '   • Los entries con likes ya se pueden eliminar';
  RAISE NOTICE '   • Los likes se eliminan automáticamente';
  RAISE NOTICE '   • Los objectives ya tenían CASCADE (seguirán funcionando)';
END $$;