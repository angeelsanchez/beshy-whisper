-- Sistema de manifestaciones: tabla principal + logs de reafirmaciones

CREATE TABLE public.manifestations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'archived')),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.manifestation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manifestation_id UUID NOT NULL REFERENCES manifestations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaffirmed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manifestation_id, reaffirmed_at)
);

ALTER TABLE public.manifestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manifestations_select" ON public.manifestations FOR SELECT USING (true);
CREATE POLICY "manifestations_insert" ON public.manifestations FOR INSERT WITH CHECK (true);
CREATE POLICY "manifestations_update" ON public.manifestations FOR UPDATE USING (true);
CREATE POLICY "manifestations_delete" ON public.manifestations FOR DELETE USING (true);

CREATE POLICY "manifestation_logs_select" ON public.manifestation_logs FOR SELECT USING (true);
CREATE POLICY "manifestation_logs_insert" ON public.manifestation_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "manifestation_logs_delete" ON public.manifestation_logs FOR DELETE USING (true);

CREATE INDEX idx_manifestations_user_id ON public.manifestations(user_id);
CREATE INDEX idx_manifestations_user_status ON public.manifestations(user_id, status);
CREATE INDEX idx_manifestation_logs_manifestation_id ON public.manifestation_logs(manifestation_id);
CREATE INDEX idx_manifestation_logs_user_date ON public.manifestation_logs(user_id, reaffirmed_at);

CREATE OR REPLACE FUNCTION update_manifestation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_manifestation_updated_at
  BEFORE UPDATE ON public.manifestations
  FOR EACH ROW
  EXECUTE FUNCTION update_manifestation_timestamp();
