-- Script para arreglar RLS en push_tokens y notifications

-- 1. Verificar estado actual de RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity, 
    forcerowsecurity
FROM pg_tables 
WHERE tablename IN ('push_tokens', 'notifications');

-- 2. Ver políticas actuales
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename IN ('push_tokens', 'notifications');

-- 3. Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 4. Asegurar que RLS esté habilitado
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS correctas para push_tokens
CREATE POLICY "push_tokens_all_operations" 
    ON public.push_tokens 
    FOR ALL 
    USING (auth.uid() = user_id);

-- 6. Crear políticas RLS correctas para notifications
CREATE POLICY "notifications_select" 
    ON public.notifications 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" 
    ON public.notifications 
    FOR INSERT 
    WITH CHECK (true); -- Permitir inserción desde el backend

-- 7. Verificar que las políticas se crearon correctamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('push_tokens', 'notifications')
ORDER BY tablename, policyname;

-- 8. Test de inserción (opcional - comentado por seguridad)
/*
-- SOLO PARA TEST - NO EJECUTAR EN PRODUCCIÓN
-- INSERT INTO public.push_tokens (user_id, endpoint, p256dh, auth, user_agent) 
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', 
--     'test-endpoint',
--     'test-p256dh',
--     'test-auth',
--     'test-agent'
-- );
*/