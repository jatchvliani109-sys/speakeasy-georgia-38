CREATE TABLE public.speaking_scenario_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scenario_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('easy','medium','hard')),
  score int NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scenario_id, tier)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.speaking_scenario_progress TO authenticated;
GRANT ALL ON public.speaking_scenario_progress TO service_role;

ALTER TABLE public.speaking_scenario_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own speaking progress"
ON public.speaking_scenario_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX speaking_scenario_progress_user_idx
  ON public.speaking_scenario_progress (user_id);

CREATE TRIGGER speaking_scenario_progress_set_updated_at
BEFORE UPDATE ON public.speaking_scenario_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();