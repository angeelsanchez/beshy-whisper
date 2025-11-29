-- Script compatible con todas las versiones de PostgreSQL/Supabase

-- 1. Verificar estado actual de RLS (versión compatible)
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('push_tokens', 'notifications')
AND schemaname = 'public';

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
WHERE tablename IN ('push_tokens', 'notifications')
AND schemaname = 'public';

-- 3. Verificar estructura de las tablas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('push_tokens', 'notifications')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 4. Contar registros existentes
SELECT 
    'push_tokens' as table_name,
    COUNT(*) as count
FROM public.push_tokens
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as count
FROM public.notifications;

-- 5. Eliminar políticas existentes si existen
DO $$
BEGIN
    -- Drop push_tokens policies
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_tokens' 
        AND policyname = 'Users can manage their own push tokens'
    ) THEN
        DROP POLICY "Users can manage their own push tokens" ON public.push_tokens;
        RAISE NOTICE 'Dropped existing push_tokens policy';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_tokens' 
        AND policyname = 'push_tokens_all_operations'
    ) THEN
        DROP POLICY "push_tokens_all_operations" ON public.push_tokens;
        RAISE NOTICE 'Dropped existing push_tokens_all_operations policy';
    END IF;

    -- Drop notifications policies
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can read their own notifications'
    ) THEN
        DROP POLICY "Users can read their own notifications" ON public.notifications;
        RAISE NOTICE 'Dropped existing notifications read policy';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'System can insert notifications'
    ) THEN
        DROP POLICY "System can insert notifications" ON public.notifications;
        RAISE NOTICE 'Dropped existing notifications insert policy';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'notifications_select'
    ) THEN
        DROP POLICY "notifications_select" ON public.notifications;
        RAISE NOTICE 'Dropped existing notifications_select policy';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'notifications_insert'
    ) THEN
        DROP POLICY "notifications_insert" ON public.notifications;
        RAISE NOTICE 'Dropped existing notifications_insert policy';
    END IF;

END $$;

-- 6. Asegurar que RLS esté habilitado
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 7. Crear políticas RLS simples y efectivas

-- Push tokens: Los usuarios pueden gestionar sus propios tokens
CREATE POLICY "push_tokens_user_access" 
    ON public.push_tokens 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Notifications: Los usuarios pueden leer sus propias notificaciones
CREATE POLICY "notifications_user_read" 
    ON public.notifications 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Notifications: Permitir inserción desde el sistema (sin restricciones para service_role)
CREATE POLICY "notifications_system_insert" 
    ON public.notifications 
    FOR INSERT 
    WITH CHECK (true);

-- 8. Verificar que las políticas se crearon correctamente
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('push_tokens', 'notifications')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ RLS configurado correctamente para push_tokens y notifications';
    RAISE NOTICE '📝 Políticas creadas:';
    RAISE NOTICE '   - push_tokens_user_access: Usuarios pueden gestionar sus tokens';
    RAISE NOTICE '   - notifications_user_read: Usuarios pueden leer sus notificaciones'; 
    RAISE NOTICE '   - notifications_system_insert: Sistema puede insertar notificaciones';
END $$;