
CREATE TABLE public.business_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_documents TO authenticated;
GRANT ALL ON public.business_documents TO service_role;

ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bd select" ON public.business_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bd insert" ON public.business_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bd update" ON public.business_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own bd delete" ON public.business_documents FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_business_documents_user_created ON public.business_documents(user_id, created_at DESC);
CREATE TRIGGER update_business_documents_updated_at BEFORE UPDATE ON public.business_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
