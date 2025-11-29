-- Debug script to check user policies and authentication context

-- 1. Check current user policies
SELECT 
  'CURRENT USER POLICIES' as status,
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 2. Test authentication context
SELECT 
  'AUTH CONTEXT' as status,
  auth.role() as current_role,
  auth.uid() as current_user_id;

-- 3. Check if RLS is enabled on users table
SELECT 
  'RLS STATUS' as status,
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 4. Test query that might be failing
-- This simulates what the frontend is trying to do
SELECT 
  'TEST QUERY SIMULATION' as status,
  'Simulating: SELECT id, alias, bsy_id, name FROM users WHERE id = user_id' as query_info;

-- Let's see if we can read any user data at all
SELECT 
  'USER DATA TEST' as status,
  COUNT(*) as total_users
FROM public.users;

-- Check if anonymous role can read users
SELECT 
  'ANONYMOUS ACCESS TEST' as status,
  grantee,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'public');