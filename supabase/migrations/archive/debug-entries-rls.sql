-- Debug script to check entries RLS policies and identify the issue

-- 1. Check current entries policies
SELECT 
  'CURRENT ENTRIES POLICIES' as status,
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'entries' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 2. Check RLS status on entries table
SELECT 
  'ENTRIES RLS STATUS' as status,
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE tablename = 'entries' AND schemaname = 'public';

-- 3. Test authentication context
SELECT 
  'AUTH CONTEXT' as status,
  auth.role() as current_role,
  auth.uid() as current_user_id;

-- 4. Check entries table structure
SELECT 
  'ENTRIES TABLE STRUCTURE' as status,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'entries' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check permissions for different roles
SELECT 
  'ROLE PERMISSIONS' as status,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'entries' 
  AND table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'public')
ORDER BY grantee, privilege_type;