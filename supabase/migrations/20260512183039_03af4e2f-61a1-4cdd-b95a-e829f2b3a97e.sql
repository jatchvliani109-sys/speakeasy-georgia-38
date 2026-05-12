
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS speaking_current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speaking_longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speaking_last_practice_date date;
