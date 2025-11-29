-- Migration to fix name update functionality for new users
-- This allows newly registered users to set their name without the 14-day restriction

-- Update the function to check if name can be updated
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

-- Make sure all new users have needs_name_input set to true
UPDATE public.users
SET needs_name_input = true
WHERE (name IS NULL OR name = '') AND last_name_update IS NULL; 