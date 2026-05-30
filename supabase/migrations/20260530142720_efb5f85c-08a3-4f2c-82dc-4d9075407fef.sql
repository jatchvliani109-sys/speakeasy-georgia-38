CREATE TABLE public.business_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text,
  mime_type text,
  full_name text,
  job_title text,
  industry text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  years_of_experience text,
  education text,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.business_resumes TO authenticated;
GRANT ALL ON public.business_resumes TO service_role;

ALTER TABLE public.business_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own resume select" ON public.business_resumes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own resume insert" ON public.business_resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own resume update" ON public.business_resumes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_business_resumes_user_recent ON public.business_resumes(user_id, created_at DESC);

CREATE TRIGGER update_business_resumes_updated_at
BEFORE UPDATE ON public.business_resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();