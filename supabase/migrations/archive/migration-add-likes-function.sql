-- Migration to add stored procedure for likes

-- Create a function to add likes
CREATE OR REPLACE FUNCTION add_like(p_user_id UUID, p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the function creator
AS $$
BEGIN
  -- Check if the like already exists
  IF EXISTS (SELECT 1 FROM public.likes WHERE user_id = p_user_id AND entry_id = p_entry_id) THEN
    RETURN FALSE; -- Like already exists
  END IF;
  
  -- Insert the like
  INSERT INTO public.likes (user_id, entry_id)
  VALUES (p_user_id, p_entry_id);
  
  RETURN TRUE; -- Successfully added like
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where like was added between check and insert
    RETURN FALSE;
  WHEN OTHERS THEN
    RAISE; -- Re-throw any other errors
END;
$$;

-- Create a function to remove likes
CREATE OR REPLACE FUNCTION remove_like(p_user_id UUID, p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the function creator
AS $$
BEGIN
  -- Delete the like
  DELETE FROM public.likes
  WHERE user_id = p_user_id AND entry_id = p_entry_id;
  
  -- Check if any rows were affected
  IF FOUND THEN
    RETURN TRUE; -- Successfully removed like
  ELSE
    RETURN FALSE; -- Like didn't exist
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE; -- Re-throw any errors
END;
$$;

-- Grant execute permissions on these functions to authenticated users
GRANT EXECUTE ON FUNCTION add_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_like(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION remove_like(UUID, UUID) TO anon; 