-- Migration to add 'edited' field to entries table

-- Add 'edited' column to entries table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'entries'
      AND column_name = 'edited'
  ) THEN
    ALTER TABLE public.entries
    ADD COLUMN edited BOOLEAN DEFAULT false;
  END IF;
END;
$$; 