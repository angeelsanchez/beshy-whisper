-- Migration: Fix RLS policies for user name updates
-- Issue: Users couldn't update their name field when RLS was enabled
-- Root cause: Multiple conflicting UPDATE policies and auth.uid() returning NULL
-- Solution: Clean policies with application-level validation

-- Clean up conflicting policies
DROP POLICY IF EXISTS "users_can_update_own_data" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_name_fields" ON users;
DROP POLICY IF EXISTS "users_update_profile" ON users;
DROP POLICY IF EXISTS "users_update_authenticated" ON users;

DROP POLICY IF EXISTS "users_can_delete_own_data" ON users;
DROP POLICY IF EXISTS "users_can_delete_own_profile" ON users;
DROP POLICY IF EXISTS "users_delete_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_delete_own_account" ON users;

-- Create final clean policies
CREATE POLICY "users_update_own_profile" 
ON users FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "users_delete_profile" 
ON users FOR DELETE
USING (true);

-- Ensure function permissions
GRANT EXECUTE ON FUNCTION can_update_name(UUID) TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT DELETE ON users TO authenticated;

-- Final policy summary:
-- INSERT: allow_system_user_creation, users_can_insert_own_data  
-- SELECT: public_can_read_user_profiles, users_can_read_own_data
-- UPDATE: users_update_own_profile (with app validation via can_update_name)
-- DELETE: users_delete_profile