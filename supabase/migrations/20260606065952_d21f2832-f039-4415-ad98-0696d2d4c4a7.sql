CREATE TABLE public.business_reassessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_version SMALLINT NOT NULL,
  score_pct NUMERIC NOT NULL,
  level_before TEXT,
  level_after TEXT,
  answers JSONB,
  open_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_reassessments TO authenticated;
GRANT ALL ON public.business_reassessments TO service_role;

ALTER TABLE public.business_reassessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own reassessments"
  ON public.business_reassessments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reassessments"
  ON public.business_reassessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reassessments"
  ON public.business_reassessments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reassessments"
  ON public.business_reassessments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX business_reassessments_user_created_idx
  ON public.business_reassessments (user_id, created_at DESC);