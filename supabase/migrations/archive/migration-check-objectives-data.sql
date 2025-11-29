-- Script para verificar y corregir datos en la tabla objectives

-- Verificar si hay registros con user_id NULL
SELECT COUNT(*) AS objectives_with_null_user_id 
FROM public.objectives 
WHERE user_id IS NULL;

-- Verificar si hay registros con entry_id que no existe en la tabla entries
SELECT COUNT(*) AS objectives_with_invalid_entry_id 
FROM public.objectives o
LEFT JOIN public.entries e ON o.entry_id = e.id
WHERE e.id IS NULL;

-- Verificar si hay registros con user_id que no existe en la tabla users
SELECT COUNT(*) AS objectives_with_invalid_user_id 
FROM public.objectives o
LEFT JOIN public.users u ON o.user_id = u.id
WHERE u.id IS NULL;

-- Eliminar objetivos con entry_id inválido (opcional, ejecutar solo si es necesario)
-- DELETE FROM public.objectives o
-- WHERE NOT EXISTS (SELECT 1 FROM public.entries e WHERE e.id = o.entry_id);

-- Eliminar objetivos con user_id NULL o inválido (opcional, ejecutar solo si es necesario)
-- DELETE FROM public.objectives o
-- WHERE o.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = o.user_id);

-- Verificar si hay registros en la tabla
SELECT COUNT(*) AS total_objectives FROM public.objectives; 