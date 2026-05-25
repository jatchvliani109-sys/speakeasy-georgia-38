
CREATE TABLE public.business_meeting_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meeting_type TEXT NOT NULL,
  company_type TEXT NOT NULL,
  scenario_key TEXT NOT NULL,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  result TEXT,
  debrief JSONB,
  session_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_meeting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bms select" ON public.business_meeting_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bms insert" ON public.business_meeting_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bms update" ON public.business_meeting_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_business_meeting_sessions_updated_at
  BEFORE UPDATE ON public.business_meeting_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
