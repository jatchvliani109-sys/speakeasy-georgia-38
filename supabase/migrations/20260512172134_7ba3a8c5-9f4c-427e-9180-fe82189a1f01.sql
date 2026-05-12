CREATE TABLE public.pronunciation_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_phrase TEXT NOT NULL,
  transcript TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  feedback_ka TEXT,
  missing_words TEXT[],
  topic TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pronunciation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pron attempts all"
ON public.pronunciation_attempts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pron_attempts_user_created ON public.pronunciation_attempts(user_id, created_at DESC);