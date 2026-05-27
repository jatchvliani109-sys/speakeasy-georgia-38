CREATE TABLE public.business_presentation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  presentation_topic TEXT NOT NULL,
  scenario_key TEXT NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT,
  debrief JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_presentation_sessions TO authenticated;
GRANT ALL ON public.business_presentation_sessions TO service_role;

ALTER TABLE public.business_presentation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bps select" ON public.business_presentation_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bps insert" ON public.business_presentation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bps update" ON public.business_presentation_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_bps_updated_at
BEFORE UPDATE ON public.business_presentation_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();