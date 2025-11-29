CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  target_days_per_week INTEGER NOT NULL DEFAULT 7 CHECK (target_days_per_week BETWEEN 1 AND 7),
  color TEXT NOT NULL DEFAULT '#4A2E1B' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, completed_at)
);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits_select" ON public.habits FOR SELECT USING (true);
CREATE POLICY "habits_insert" ON public.habits FOR INSERT WITH CHECK (true);
CREATE POLICY "habits_update" ON public.habits FOR UPDATE USING (true);
CREATE POLICY "habits_delete" ON public.habits FOR DELETE USING (true);

CREATE POLICY "habit_logs_select" ON public.habit_logs FOR SELECT USING (true);
CREATE POLICY "habit_logs_insert" ON public.habit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "habit_logs_delete" ON public.habit_logs FOR DELETE USING (true);

CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_user_active ON public.habits(user_id, is_active);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, completed_at);
CREATE INDEX idx_habit_logs_habit_date ON public.habit_logs(habit_id, completed_at DESC);

CREATE OR REPLACE FUNCTION update_habit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_habit_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_timestamp();
