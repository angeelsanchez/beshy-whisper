-- Script para verificar y recrear la migración si es necesario

DO $$
BEGIN
    -- Verificar si la tabla push_tokens existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_tokens') THEN
        RAISE NOTICE 'Tabla push_tokens no existe, creándola...';
        
        -- Crear tabla push_tokens
        CREATE TABLE public.push_tokens (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            endpoint TEXT,
            p256dh TEXT,
            auth TEXT,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        RAISE NOTICE 'Tabla push_tokens creada';
    ELSE
        RAISE NOTICE 'Tabla push_tokens ya existe';
    END IF;
    
    -- Verificar y habilitar RLS
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE tablename = 'push_tokens' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado en push_tokens';
    END IF;
    
    -- Crear política RLS si no existe
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'push_tokens' 
        AND policyname = 'Users can manage their own push tokens'
    ) THEN
        CREATE POLICY "Users can manage their own push tokens" 
            ON public.push_tokens FOR ALL 
            USING (auth.uid() = user_id);
        RAISE NOTICE 'Política RLS creada para push_tokens';
    END IF;
    
    -- Crear índice si no existe
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'push_tokens' 
        AND indexname = 'push_tokens_user_id_idx'
    ) THEN
        CREATE INDEX push_tokens_user_id_idx ON public.push_tokens(user_id);
        RAISE NOTICE 'Índice push_tokens_user_id_idx creado';
    END IF;
    
    -- Verificar si la tabla notifications existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE 'Tabla notifications no existe, creándola...';
        
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            data JSONB,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        
        -- Crear políticas
        CREATE POLICY "Users can read their own notifications" 
            ON public.notifications FOR SELECT 
            USING (auth.uid() = user_id);
            
        CREATE POLICY "System can insert notifications" 
            ON public.notifications FOR INSERT 
            WITH CHECK (true);
        
        -- Crear índices
        CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
        CREATE INDEX notifications_type_idx ON public.notifications(type);
        CREATE INDEX notifications_sent_at_idx ON public.notifications(sent_at);
        
        RAISE NOTICE 'Tabla notifications creada con políticas e índices';
    ELSE
        RAISE NOTICE 'Tabla notifications ya existe';
    END IF;
    
END $$;