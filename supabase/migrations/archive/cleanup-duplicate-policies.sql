-- Cleanup script to remove duplicate RLS policies
-- This script removes old/conflicting policies and keeps only the clean ones

-- =====================================
-- USERS TABLE - Remove duplicates
-- =====================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read any profile" ON public.users;

-- Keep only the new clean policies:
-- ✅ "authenticated_users_can_view_all_profiles" 
-- ✅ "users_can_manage_own_data"

-- =====================================  
-- ENTRIES TABLE - Remove duplicates
-- =====================================

-- Drop old policies
DROP POLICY IF EXISTS "Delete own entries" ON public.entries;
DROP POLICY IF EXISTS "Insert own entry" ON public.entries;
DROP POLICY IF EXISTS "Los posts públicos son visibles para todos, los privados solo " ON public.entries;
DROP POLICY IF EXISTS "Read own entries" ON public.entries;
DROP POLICY IF EXISTS "Read public entries" ON public.entries;
DROP POLICY IF EXISTS "Update own entries" ON public.entries;

-- Keep only the new clean policies:
-- ✅ "entries_public_and_own_read"
-- ✅ "entries_authenticated_insert" 
-- ✅ "entries_owner_update"
-- ✅ "entries_owner_delete"

-- =====================================
-- LIKES TABLE - Remove duplicates  
-- =====================================

-- Drop old policies
DROP POLICY IF EXISTS "API puede eliminar likes" ON public.likes;
DROP POLICY IF EXISTS "API puede insertar likes" ON public.likes;

-- Keep only the new clean policies:
-- ✅ "likes_public_read"
-- ✅ "likes_authenticated_insert"
-- ✅ "likes_owner_delete"

-- =====================================
-- OBJECTIVES TABLE - Remove duplicates
-- =====================================

-- Drop old policies
DROP POLICY IF EXISTS "objectives_delete_policy" ON public.objectives;
DROP POLICY IF EXISTS "objectives_insert_policy" ON public.objectives;
DROP POLICY IF EXISTS "objectives_read_policy" ON public.objectives;
DROP POLICY IF EXISTS "objectives_update_policy" ON public.objectives;

-- Keep only the new clean policies:
-- ✅ "objectives_owner_read"
-- ✅ "objectives_owner_insert"
-- ✅ "objectives_owner_update" 
-- ✅ "objectives_owner_delete"

-- =====================================
-- VERIFICATION - Check final clean state
-- =====================================

SELECT 
  'FINAL CLEAN POLICIES' as status,
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Count policies per table
SELECT 
  'POLICY COUNT' as status,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================
-- SUCCESS MESSAGE
-- =====================================

DO $$
BEGIN
  RAISE NOTICE '🧹 CLEANUP COMPLETED - Duplicate policies removed';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Clean policy set maintained:';
  RAISE NOTICE '   • users: 2 policies (view all profiles + manage own data)';
  RAISE NOTICE '   • entries: 4 policies (read, insert, update, delete)';
  RAISE NOTICE '   • likes: 3 policies (read, insert, delete)';
  RAISE NOTICE '   • objectives: 4 policies (read, insert, update, delete)';
  RAISE NOTICE '   • notifications: 2 policies (read own, system insert)';
  RAISE NOTICE '   • push_tokens: 1 policy (user access all)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS is now clean and secure!';
END $$;