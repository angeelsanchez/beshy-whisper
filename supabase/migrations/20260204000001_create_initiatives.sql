-- Tabla principal de iniciativas comunitarias
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  icon TEXT CHECK (icon IS NULL OR char_length(icon) BETWEEN 1 AND 10),
  color TEXT NOT NULL DEFAULT '#4A2E1B' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  category TEXT CHECK (category IN ('health','mind','productivity','wellness','social','creativity')),
  tracking_type TEXT NOT NULL DEFAULT 'binary' CHECK (tracking_type IN ('binary','quantity','timer')),
  target_value NUMERIC CHECK (target_value IS NULL OR target_value > 0),
  unit TEXT CHECK (unit IS NULL OR char_length(unit) BETWEEN 1 AND 20),
  start_date DATE NOT NULL,
  end_date DATE CHECK (end_date IS NULL OR end_date > start_date),
  max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
  participant_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reminder_time TEXT CHECK (reminder_time IS NULL OR reminder_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  community_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT initiative_quantity_timer_requires_target CHECK (
    tracking_type = 'binary' OR (target_value IS NOT NULL AND unit IS NOT NULL)
  )
);

-- Participantes (quién se unió a qué iniciativa)
CREATE TABLE initiative_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  left_at TIMESTAMPTZ,
  UNIQUE(initiative_id, user_id)
);

-- Logs de check-in diario
CREATE TABLE initiative_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at DATE NOT NULL,
  value NUMERIC CHECK (value IS NULL OR value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(initiative_id, user_id, completed_at)
);

-- Snapshots diarios pre-computados (evita COUNT en cada page load)
CREATE TABLE initiative_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_participants INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(initiative_id, date)
);

-- Indexes para rendimiento
CREATE INDEX idx_initiatives_active ON initiatives(is_active) WHERE is_active = true;
CREATE INDEX idx_initiatives_dates ON initiatives(start_date, end_date);
CREATE INDEX idx_initiatives_creator ON initiatives(creator_id);
CREATE INDEX idx_init_participants_initiative ON initiative_participants(initiative_id) WHERE is_active = true;
CREATE INDEX idx_init_participants_user ON initiative_participants(user_id) WHERE is_active = true;
CREATE INDEX idx_init_participants_composite ON initiative_participants(initiative_id, user_id) WHERE is_active = true;
CREATE INDEX idx_init_logs_initiative_date ON initiative_logs(initiative_id, completed_at);
CREATE INDEX idx_init_logs_user ON initiative_logs(user_id, completed_at);
CREATE INDEX idx_init_logs_composite ON initiative_logs(initiative_id, completed_at, user_id);
CREATE INDEX idx_init_daily_stats_lookup ON initiative_daily_stats(initiative_id, date);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_initiative_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initiative_updated_at
  BEFORE UPDATE ON initiatives
  FOR EACH ROW
  EXECUTE FUNCTION update_initiative_updated_at();

-- RLS (reads permisivos via anon key, writes via supabaseAdmin)
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_active_initiatives" ON initiatives FOR SELECT USING (is_active = true);
CREATE POLICY "read_participants" ON initiative_participants FOR SELECT USING (true);
CREATE POLICY "read_logs" ON initiative_logs FOR SELECT USING (true);
CREATE POLICY "read_daily_stats" ON initiative_daily_stats FOR SELECT USING (true);
