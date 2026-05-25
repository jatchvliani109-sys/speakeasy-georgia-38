
CREATE TABLE public.business_email_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  scenario_key TEXT NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_email TEXT,
  feedback JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bes_user_created ON public.business_email_sessions(user_id, created_at DESC);

ALTER TABLE public.business_email_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bes select" ON public.business_email_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bes insert" ON public.business_email_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bes update" ON public.business_email_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_bes_updated_at
  BEFORE UPDATE ON public.business_email_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
