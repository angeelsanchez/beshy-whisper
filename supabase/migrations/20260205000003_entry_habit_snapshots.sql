ALTER TABLE public.habits
  ADD COLUMN is_shareable BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE public.entry_habit_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE SET NULL,
  habit_name TEXT NOT NULL,
  habit_icon TEXT,
  habit_color TEXT NOT NULL DEFAULT '#4A2E1B',
  tracking_type TEXT NOT NULL DEFAULT 'binary',
  target_value NUMERIC,
  unit TEXT,
  completed_value NUMERIC,
  is_completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entry_id, habit_id)
);

CREATE INDEX idx_entry_habit_snapshots_entry ON public.entry_habit_snapshots(entry_id);
