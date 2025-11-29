-- Script para identificar y eliminar objetivos huérfanos

-- Identificar objetivos con entry_id que no existe en la tabla entries
SELECT o.id, o.entry_id, o.text
FROM public.objectives o
LEFT JOIN public.entries e ON o.entry_id = e.id
WHERE e.id IS NULL;

-- Eliminar objetivos huérfanos
DELETE FROM public.objectives o
WHERE NOT EXISTS (SELECT 1 FROM public.entries e WHERE e.id = o.entry_id);

-- Verificar si hay registros con user_id NULL
SELECT COUNT(*) AS objectives_with_null_user_id 
FROM public.objectives 
WHERE user_id IS NULL;

-- Actualizar objetivos con user_id NULL (si existen)
-- Nota: Esto asignará todos los objetivos con user_id NULL a un usuario específico
-- Reemplaza 'USUARIO_ID_AQUI' con un ID de usuario válido de tu base de datos
-- UPDATE public.objectives SET user_id = 'USUARIO_ID_AQUI' WHERE user_id IS NULL;

-- Verificar que se han eliminado todos los objetivos huérfanos
SELECT COUNT(*) AS remaining_orphaned_objectives
FROM public.objectives o
LEFT JOIN public.entries e ON o.entry_id = e.id
WHERE e.id IS NULL;

-- Verificar cuántos objetivos quedan en total
SELECT COUNT(*) AS total_objectives FROM public.objectives; 