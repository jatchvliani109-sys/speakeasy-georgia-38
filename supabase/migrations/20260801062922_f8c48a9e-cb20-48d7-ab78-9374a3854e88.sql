ALTER TABLE public.business_interview_sessions
  ADD COLUMN IF NOT EXISTS abandoned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS business_interview_sessions_resumable_idx
  ON public.business_interview_sessions (user_id, created_at DESC)
  WHERE completed = false AND abandoned = false;