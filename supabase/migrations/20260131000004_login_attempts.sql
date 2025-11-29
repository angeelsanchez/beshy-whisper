CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_login_attempts_ip_email ON public.login_attempts(ip_address, email, attempted_at DESC);
CREATE INDEX idx_login_attempts_cleanup ON public.login_attempts(attempted_at);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION cleanup_old_login_attempts() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE attempted_at < now() - INTERVAL '24 hours';
END;
$$;
