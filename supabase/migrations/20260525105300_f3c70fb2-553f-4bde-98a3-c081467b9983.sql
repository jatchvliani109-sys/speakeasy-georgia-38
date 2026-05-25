
CREATE TABLE public.business_interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_title TEXT NOT NULL,
  company_type TEXT NOT NULL,
  scenario_key TEXT NOT NULL,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT,
  debrief JSONB,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bis select" ON public.business_interview_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bis insert" ON public.business_interview_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bis update" ON public.business_interview_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_bis_updated_at
  BEFORE UPDATE ON public.business_interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
