CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.business_state (
  user_id UUID NOT NULL PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  self_intros JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own business_state select" ON public.business_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own business_state insert" ON public.business_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own business_state update" ON public.business_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER business_state_set_updated_at
  BEFORE UPDATE ON public.business_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();