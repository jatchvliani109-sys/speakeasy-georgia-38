
CREATE TABLE public.business_vocab_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  word_key text NOT NULL,
  source text NOT NULL DEFAULT 'core',
  field text,
  confidence integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  manual_label text,
  due_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_vocab_progress TO authenticated;
GRANT ALL ON public.business_vocab_progress TO service_role;

ALTER TABLE public.business_vocab_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bvp select" ON public.business_vocab_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bvp insert" ON public.business_vocab_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bvp update" ON public.business_vocab_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own bvp delete" ON public.business_vocab_progress FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_bvp_user_due ON public.business_vocab_progress(user_id, due_at);

CREATE TABLE public.business_vocab_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  new_words integer NOT NULL DEFAULT 0,
  review_words integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_vocab_sessions TO authenticated;
GRANT ALL ON public.business_vocab_sessions TO service_role;

ALTER TABLE public.business_vocab_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bvs select" ON public.business_vocab_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bvs insert" ON public.business_vocab_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bvs update" ON public.business_vocab_sessions FOR UPDATE USING (auth.uid() = user_id);
