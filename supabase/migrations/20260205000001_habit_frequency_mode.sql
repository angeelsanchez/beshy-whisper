-- F4: Flexible weekly frequency mode for habits
-- Allows habits to be tracked as "X days per week" without specifying exact days

ALTER TABLE public.habits
  ADD COLUMN frequency_mode TEXT NOT NULL DEFAULT 'specific_days'
    CHECK (frequency_mode IN ('specific_days', 'weekly_count'));

ALTER TABLE public.habits
  ADD COLUMN weekly_target INTEGER
    CHECK (weekly_target IS NULL OR weekly_target BETWEEN 1 AND 7);

ALTER TABLE public.habits
  ADD CONSTRAINT habits_frequency_mode_consistency
    CHECK (frequency_mode = 'specific_days' OR weekly_target IS NOT NULL);
