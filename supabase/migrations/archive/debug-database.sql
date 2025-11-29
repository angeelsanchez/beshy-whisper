-- Debug script para verificar la estructura de la base de datos

-- 1. Verificar si la tabla push_tokens existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'push_tokens';

-- 2. Ver la estructura de la tabla push_tokens
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'push_tokens'
ORDER BY ordinal_position;

-- 3. Verificar constraints y keys
SELECT 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'push_tokens';

-- 4. Verificar policies RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'push_tokens';

-- 5. Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'push_tokens';

-- 6. Contar registros existentes
SELECT COUNT(*) as total_push_tokens FROM public.push_tokens;

-- 7. Ver algunos registros de ejemplo (sin datos sensibles)
SELECT 
    id,
    user_id,
    LEFT(endpoint, 50) || '...' as endpoint_preview,
    LENGTH(p256dh) as p256dh_length,
    LENGTH(auth) as auth_length,
    created_at,
    updated_at
FROM public.push_tokens 
LIMIT 3;