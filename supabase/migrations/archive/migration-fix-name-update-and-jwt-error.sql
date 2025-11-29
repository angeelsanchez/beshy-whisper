-- Migración para solucionar problemas con la actualización de nombres y error de JWT
-- Esta migración hace dos cosas:
-- 1. Asegura que todos los usuarios nuevos tengan needs_name_input = true
-- 2. Actualiza la función can_update_name para permitir actualizar el nombre a usuarios nuevos

-- Actualizar la función para verificar si un usuario puede cambiar su nombre
CREATE OR REPLACE FUNCTION can_update_name(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_update TIMESTAMP WITH TIME ZONE;
    needs_input BOOLEAN;
BEGIN
    SELECT last_name_update, needs_name_input INTO last_update, needs_input
    FROM public.users
    WHERE id = user_id;
    
    -- Siempre permitir actualización si el usuario necesita configurar su nombre por primera vez
    IF needs_input THEN
        RETURN true;
    END IF;
    
    -- Permitir actualización si la última actualización fue hace más de 14 días o es NULL
    RETURN (last_update IS NULL OR last_update < (NOW() - INTERVAL '14 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que todos los usuarios nuevos tengan needs_name_input establecido como true
UPDATE public.users
SET needs_name_input = true
WHERE (name IS NULL OR name = '') AND last_name_update IS NULL;

-- Para usuarios que tienen nombre pero nunca han actualizado su nombre (primera vez)
UPDATE public.users
SET last_name_update = NOW()
WHERE name IS NOT NULL AND name != '' AND last_name_update IS NULL;

-- Agregar un índice para mejorar el rendimiento de las consultas de nombre
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);

-- Asegurar que todos los usuarios tengan un bsy_id válido
UPDATE public.users
SET bsy_id = 'BSY' || LPAD(id::text, 3, '0')
WHERE bsy_id IS NULL OR bsy_id = ''; 