-- Migration to add a function for counting likes for entries

-- Create a function to count likes for an array of entry IDs
CREATE OR REPLACE FUNCTION count_likes_for_entries(entry_ids UUID[])
RETURNS TABLE(count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the function creator
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT
  FROM public.likes
  WHERE entry_id = ANY(entry_ids);
END;
$$;

-- Grant execute permissions to authenticated users and anon
GRANT EXECUTE ON FUNCTION count_likes_for_entries(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION count_likes_for_entries(UUID[]) TO anon; 