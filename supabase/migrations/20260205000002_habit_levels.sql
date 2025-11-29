CREATE TABLE public.habit_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL CHECK (level_number >= 1),
  label TEXT CHECK (label IS NULL OR char_length(label) <= 100),
  target_days INTEGER[],
  weekly_target INTEGER CHECK (weekly_target IS NULL OR weekly_target BETWEEN 1 AND 7),
  target_value NUMERIC CHECK (target_value IS NULL OR target_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, level_number)
);

ALTER TABLE public.habits
  ADD COLUMN has_progression BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN current_level INTEGER DEFAULT NULL,
  ADD COLUMN level_started_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_habit_levels_habit ON public.habit_levels(habit_id);
