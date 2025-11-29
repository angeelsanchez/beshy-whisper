-- Add provider ID columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create an index for faster lookups by provider ID
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);

-- Migration comment
COMMENT ON TABLE public.users IS 'User accounts with support for OAuth providers'; 