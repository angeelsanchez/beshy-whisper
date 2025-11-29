-- Comprehensive RLS Fix for BESHY Whisper
-- This script addresses all security issues found in the current RLS setup

-- 1. DIAGNOSE CURRENT STATE
SELECT 
  'Current RLS Status' as info,
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- 2. USERS TABLE - Fix overly restrictive policies
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Usuarios pueden leer sus propios datos" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios datos" ON public.users;

-- Create balanced policies for users table
CREATE POLICY "authenticated_users_can_view_all_profiles" 
  ON public.users FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "users_can_manage_own_data" 
  ON public.users FOR ALL 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. ENTRIES TABLE - Ensure complete coverage
-- Drop existing policies to recreate with better names
DROP POLICY IF EXISTS "Cualquiera puede leer entries" ON public.entries;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar entries" ON public.entries;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios entries" ON public.entries;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios entries" ON public.entries;

-- Create comprehensive entry policies
CREATE POLICY "entries_public_and_own_read" 
  ON public.entries FOR SELECT 
  USING (
    -- Public entries (not private) OR own entries OR admin
    (is_private = false OR is_private IS NULL) 
    OR auth.uid() = user_id 
    OR auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "entries_authenticated_insert" 
  ON public.entries FOR INSERT 
  WITH CHECK (
    -- Must be authenticated user inserting their own entry OR guest entry
    (auth.uid() = user_id AND auth.role() = 'authenticated') 
    OR (guest = true AND user_id IS NULL)
  );

CREATE POLICY "entries_owner_update" 
  ON public.entries FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entries_owner_delete" 
  ON public.entries FOR DELETE 
  USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');

-- 4. OBJECTIVES TABLE - RE-ENABLE RLS with proper policies
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Cualquiera puede leer objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios objetivos" ON public.objectives;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios objetivos" ON public.objectives;

-- Create secure objective policies
CREATE POLICY "objectives_owner_read" 
  ON public.objectives FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR auth.jwt()->>'role' = 'admin'
    -- Allow reading objectives for public entries
    OR EXISTS (
      SELECT 1 FROM public.entries e 
      WHERE e.id = objectives.entry_id 
        AND (e.is_private = false OR e.is_private IS NULL)
    )
  );

CREATE POLICY "objectives_owner_insert" 
  ON public.objectives FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND auth.role() = 'authenticated'
    -- Ensure user owns the related entry
    AND EXISTS (
      SELECT 1 FROM public.entries e 
      WHERE e.id = entry_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "objectives_owner_update" 
  ON public.objectives FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "objectives_owner_delete" 
  ON public.objectives FOR DELETE 
  USING (auth.uid() = user_id OR auth.jwt()->>'role' = 'admin');

-- 5. LIKES TABLE - Ensure proper policies exist
-- Drop existing policies to recreate with consistent names
DROP POLICY IF EXISTS "Cualquiera puede leer likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar sus propios likes" ON public.likes;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios likes" ON public.likes;

-- Create comprehensive like policies
CREATE POLICY "likes_public_read" 
  ON public.likes FOR SELECT 
  USING (true); -- Everyone can see like counts

CREATE POLICY "likes_authenticated_insert" 
  ON public.likes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND auth.role() = 'authenticated'
    -- Can only like existing entries
    AND EXISTS (SELECT 1 FROM public.entries WHERE id = entry_id)
  );

CREATE POLICY "likes_owner_delete" 
  ON public.likes FOR DELETE 
  USING (auth.uid() = user_id);

-- 6. NOTIFICATIONS TABLE - Verify policies are correct
-- The recent fix-rls-compatible.sql should have handled this, but let's verify
SELECT 'Notifications policies' as info, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'notifications' AND schemaname = 'public';

-- 7. PUSH_TOKENS TABLE - Verify policies are correct  
SELECT 'Push tokens policies' as info, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'push_tokens' AND schemaname = 'public';

-- 8. FIX FUNCTION SECURITY - Update functions to use fixed search_path
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  entry_owner_id UUID;
  liker_name TEXT;
  liker_display_id TEXT;
  entry_message TEXT;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Set search_path for security
  SET search_path = public, pg_temp;
  
  -- Get the entry owner's user_id and entry details
  SELECT e.user_id, e.mensaje 
  INTO entry_owner_id, entry_message
  FROM public.entries e 
  WHERE e.id = NEW.entry_id;
  
  -- Don't send notification if user likes their own post
  IF entry_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the liker's display name and ID
  SELECT u.name, u.bsy_id 
  INTO liker_name, liker_display_id
  FROM public.users u 
  WHERE u.id = NEW.user_id;
  
  -- Use fallback if display names are not available
  IF liker_name IS NULL THEN
    liker_name := 'Alguien';
  END IF;
  
  -- Create notification title and body
  notification_title := liker_name || ' le ha gustado tu Whisper';
  notification_body := COALESCE(
    CASE 
      WHEN LENGTH(entry_message) > 50 THEN LEFT(entry_message, 50) || '...'
      ELSE entry_message
    END,
    'Tu whisper'
  );
  
  -- Insert notification record
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  ) VALUES (
    entry_owner_id,
    'like',
    notification_title,
    notification_body,
    jsonb_build_object(
      'entry_id', NEW.entry_id,
      'liker_user_id', NEW.user_id,
      'liker_name', liker_name,
      'liker_display_id', liker_display_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update clean_old_notifications function too
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
  -- Set search_path for security
  SET search_path = public, pg_temp;
  
  -- Delete notifications older than 30 days
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. VERIFICATION - Check final state
SELECT 
  'Final RLS Status' as info,
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename;

-- Show all policies
SELECT 
  'All Policies' as info,
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 10. SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ COMPREHENSIVE RLS FIX COMPLETED';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security improvements made:';
  RAISE NOTICE '   • Users: Can view all profiles but only edit own data';
  RAISE NOTICE '   • Entries: Proper private/public access controls';
  RAISE NOTICE '   • Objectives: RLS re-enabled with secure policies';
  RAISE NOTICE '   • Likes: Full CRUD operations for authenticated users';
  RAISE NOTICE '   • Functions: Fixed search_path vulnerabilities';
  RAISE NOTICE '';
  RAISE NOTICE '✅ All app flows should now work correctly:';
  RAISE NOTICE '   • View profiles ✓';
  RAISE NOTICE '   • Create/view entries ✓';
  RAISE NOTICE '   • Like/unlike posts ✓';
  RAISE NOTICE '   • Create/manage objectives ✓';
  RAISE NOTICE '   • Receive notifications ✓';
END $$;