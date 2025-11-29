-- ===================================================================
-- RE-ENABLE RLS ON ALL TABLES
-- All API routes now use supabaseAdmin (service_role) which bypasses RLS.
-- Client-side reads use anon key, so policies allow SELECT on public data.
-- Client-side writes (WhisperForm, ObjectivesList) still use anon key
-- and need permissive INSERT policies until migrated to API routes.
-- ===================================================================

-- =============================
-- DROP ALL EXISTING POLICIES (clean slate)
-- =============================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'entries', 'likes', 'objectives', 'notifications', 'push_tokens')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- =============================
-- DROP DEBUG FUNCTIONS
-- =============================

DROP FUNCTION IF EXISTS test_entry_deletion(UUID);
DROP FUNCTION IF EXISTS debug_entry_permissions(UUID);

-- =============================
-- ENABLE RLS ON ALL TABLES
-- =============================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- =============================
-- USERS
-- =============================

CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- =============================
-- ENTRIES
-- =============================

CREATE POLICY "entries_select_public" ON public.entries
  FOR SELECT USING (is_private = false OR is_private IS NULL);

CREATE POLICY "entries_insert" ON public.entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "entries_update" ON public.entries
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "entries_delete" ON public.entries
  FOR DELETE USING (true);

-- =============================
-- LIKES
-- =============================

CREATE POLICY "likes_select" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert" ON public.likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "likes_delete" ON public.likes
  FOR DELETE USING (true);

-- =============================
-- OBJECTIVES
-- =============================

CREATE POLICY "objectives_select" ON public.objectives
  FOR SELECT USING (true);

CREATE POLICY "objectives_insert" ON public.objectives
  FOR INSERT WITH CHECK (true);

CREATE POLICY "objectives_update" ON public.objectives
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "objectives_delete" ON public.objectives
  FOR DELETE USING (true);

-- =============================
-- NOTIFICATIONS
-- =============================

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (true) WITH CHECK (true);

-- =============================
-- PUSH_TOKENS
-- =============================

CREATE POLICY "push_tokens_select" ON public.push_tokens
  FOR SELECT USING (true);

CREATE POLICY "push_tokens_insert" ON public.push_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "push_tokens_update" ON public.push_tokens
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "push_tokens_delete" ON public.push_tokens
  FOR DELETE USING (true);
