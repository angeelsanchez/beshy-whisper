-- Migration to add name management functionality to BESHY Whisper
-- Run these commands in order to implement the feature

-- 1. Add name and bsy_id columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bsy_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS needs_name_input BOOLEAN DEFAULT false;

-- 2. Update existing users to set bsy_id from alias (for compatibility)
UPDATE public.users 
SET bsy_id = alias
WHERE bsy_id IS NULL AND alias LIKE 'BSY%';

-- 3. Set name to a default value for existing users
UPDATE public.users
SET name = 'Usuario ' || COALESCE(bsy_id, alias)
WHERE name IS NULL;

-- 4. Create an index for faster lookups by bsy_id
CREATE INDEX IF NOT EXISTS idx_users_bsy_id ON public.users(bsy_id);

-- 5. Add comments to the columns
COMMENT ON COLUMN public.users.name IS 'User display name (max 50 characters, can be edited every 14 days)';
COMMENT ON COLUMN public.users.bsy_id IS 'Unique BSYXXX identifier (format BSY followed by 3 digits, permanent)';
COMMENT ON COLUMN public.users.last_name_update IS 'Timestamp of the last name update, used to enforce 14-day edit restriction';
COMMENT ON COLUMN public.users.needs_name_input IS 'Flag to indicate if user needs to set their name (e.g. after Google login)';

-- 6. Create function to check if name can be updated (14-day rule)
CREATE OR REPLACE FUNCTION can_update_name(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_update TIMESTAMP WITH TIME ZONE;
    needs_input BOOLEAN;
BEGIN
    SELECT last_name_update, needs_name_input INTO last_update, needs_input
    FROM public.users
    WHERE id = user_id;
    
    -- Always allow update if user needs to set their name for the first time
    IF needs_input THEN
        RETURN true;
    END IF;
    
    -- Allow update if last update was more than 14 days ago or is NULL
    RETURN (last_update IS NULL OR last_update < (NOW() - INTERVAL '14 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fix any inconsistencies in the users table
-- Set needs_name_input for users without a name
UPDATE public.users
SET needs_name_input = true
WHERE name IS NULL OR name = '';

-- 8. Make sure all users have a bsy_id
-- For any users without a bsy_id, generate one from their alias or a new one
DO $$
DECLARE
    user_record RECORD;
    next_bsy_id TEXT;
    max_bsy_number INT;
BEGIN
    -- Find the highest existing BSY number
    SELECT COALESCE(MAX(NULLIF(regexp_replace(bsy_id, '[^0-9]', '', 'g'), '')::INT), 0)
    INTO max_bsy_number
    FROM public.users
    WHERE bsy_id LIKE 'BSY%';
    
    -- For each user without a bsy_id
    FOR user_record IN 
        SELECT id, alias FROM public.users WHERE bsy_id IS NULL
    LOOP
        -- Increment the BSY number
        max_bsy_number := max_bsy_number + 1;
        
        -- Format with leading zeros
        next_bsy_id := 'BSY' || LPAD(max_bsy_number::TEXT, 3, '0');
        
        -- Update the user
        UPDATE public.users
        SET bsy_id = next_bsy_id
        WHERE id = user_record.id;
    END LOOP;
END $$; 