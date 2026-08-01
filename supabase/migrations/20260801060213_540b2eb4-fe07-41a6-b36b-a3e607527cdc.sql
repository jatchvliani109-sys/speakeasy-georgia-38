CREATE TABLE public.resume_parse_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.resume_parse_events TO service_role;

ALTER TABLE public.resume_parse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages resume parse events"
  ON public.resume_parse_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_resume_parse_events_user_created
  ON public.resume_parse_events (user_id, created_at DESC);