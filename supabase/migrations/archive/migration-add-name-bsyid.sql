-- Migration to add name and bsy_id fields to the users table in BESHY Whisper

-- Add name and bsy_id columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bsy_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS needs_name_input BOOLEAN DEFAULT false;

-- Update existing users to set bsy_id from alias (for compatibility)
UPDATE public.users 
SET bsy_id = alias
WHERE bsy_id IS NULL AND alias LIKE 'BSY%';

-- Set name to a default value for existing users
UPDATE public.users
SET name = 'Usuario ' || alias
WHERE name IS NULL;

-- Create an index for faster lookups by bsy_id
CREATE INDEX IF NOT EXISTS idx_users_bsy_id ON public.users(bsy_id);

-- Add a comment to the columns
COMMENT ON COLUMN public.users.name IS 'User display name (max 50 characters, can be edited every 14 days)';
COMMENT ON COLUMN public.users.bsy_id IS 'Unique BSYXXX identifier (format BSY followed by 3 digits, permanent)';
COMMENT ON COLUMN public.users.last_name_update IS 'Timestamp of the last name update, used to enforce 14-day edit restriction';
COMMENT ON COLUMN public.users.needs_name_input IS 'Flag to indicate if user needs to set their name (e.g. after Google login)';

-- Create function to check if name can be updated (14-day rule)
CREATE OR REPLACE FUNCTION can_update_name(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_update TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT last_name_update INTO last_update
    FROM public.users
    WHERE id = user_id;
    
    -- Allow update if last update was more than 14 days ago or is NULL
    RETURN (last_update IS NULL OR last_update < (NOW() - INTERVAL '14 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 