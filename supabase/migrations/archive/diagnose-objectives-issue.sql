-- Script de diagnóstico para la tabla objectives

-- 1. Verificar la estructura de la tabla (columnas)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'objectives' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si la tabla tiene RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'objectives';

-- 3. Verificar las políticas actuales
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objectives';

-- 4. Verificar los permisos de la tabla
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'objectives' AND table_schema = 'public';

-- 5. Verificar si hay datos en la tabla
SELECT COUNT(*) FROM public.objectives;

-- 6. Verificar si hay restricciones en la tabla
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.objectives'::regclass;

-- 7. Verificar si hay triggers en la tabla
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'objectives' AND event_object_schema = 'public'; 