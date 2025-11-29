-- Migration to fix likes logic in BESHY Whisper
-- This migration ensures each user can like multiple posts but only once per post

-- 1. Ensure we have a unique constraint on user_id and entry_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'unique_like_per_user_post'
  ) THEN
    ALTER TABLE public.likes ADD CONSTRAINT unique_like_per_user_post UNIQUE (user_id, entry_id);
  END IF;
END $$;

-- 2. Drop existing functions before recreating them with new return types
DROP FUNCTION IF EXISTS add_like(UUID, UUID);
DROP FUNCTION IF EXISTS remove_like(UUID, UUID);
DROP FUNCTION IF EXISTS check_like_status(UUID, UUID);
DROP FUNCTION IF EXISTS get_likes_count(UUID);

-- 3. Create or replace the add_like function to properly handle toggle functionality
CREATE OR REPLACE FUNCTION add_like(p_user_id UUID, p_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the function creator
AS $$
DECLARE
  like_id UUID;
  result JSONB;
BEGIN
  -- Check if the like already exists
  SELECT id INTO like_id
  FROM public.likes
  WHERE user_id = p_user_id AND entry_id = p_entry_id;
  
  IF like_id IS NOT NULL THEN
    -- Like exists, so remove it (toggle off)
    DELETE FROM public.likes
    WHERE id = like_id;
    
    result := jsonb_build_object(
      'success', true,
      'action', 'unliked',
      'liked', false
    );
  ELSE
    -- Like doesn't exist, so add it (toggle on)
    INSERT INTO public.likes (user_id, entry_id)
    VALUES (p_user_id, p_entry_id)
    RETURNING id INTO like_id;
    
    result := jsonb_build_object(
      'success', true,
      'action', 'liked',
      'liked', true
    );
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where like was added between check and insert
    result := jsonb_build_object(
      'success', false,
      'error', 'Unique violation occurred'
    );
    RETURN result;
  WHEN OTHERS THEN
    RAISE; -- Re-throw any other errors
END;
$$;

-- 4. Create or replace the check_like_status function to check if a user has liked a post
CREATE OR REPLACE FUNCTION check_like_status(p_user_id UUID, p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.likes
    WHERE user_id = p_user_id AND entry_id = p_entry_id
  );
END;
$$;

-- 5. Create or replace the get_likes_count function to get the number of likes for a post
CREATE OR REPLACE FUNCTION get_likes_count(p_entry_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  likes_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO likes_count
  FROM public.likes
  WHERE entry_id = p_entry_id;
  
  RETURN likes_count;
END;
$$;

-- 6. Grant execute permissions on these functions
GRANT EXECUTE ON FUNCTION add_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_like_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_likes_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_like(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_like_status(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_likes_count(UUID) TO anon; 