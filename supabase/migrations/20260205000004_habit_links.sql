CREATE TABLE public.habit_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  responder_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT no_self_link CHECK (requester_id <> responder_id)
);

CREATE INDEX idx_habit_links_requester ON public.habit_links(requester_id, status);
CREATE INDEX idx_habit_links_responder ON public.habit_links(responder_id, status);
