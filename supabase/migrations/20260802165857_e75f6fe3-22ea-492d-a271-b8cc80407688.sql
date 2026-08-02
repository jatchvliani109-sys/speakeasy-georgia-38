-- 1. Tighten always-true write policies
DROP POLICY IF EXISTS "anyone can insert events" ON public.analytics_events;
CREATE POLICY "users insert own events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- service_role bypasses RLS; a USING(true)/WITH CHECK(true) ALL policy is unnecessary
DROP POLICY IF EXISTS "service role manages resume parse events" ON public.resume_parse_events;

-- 2. Restrict SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.claim_trial(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_claimed_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_trial(boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_claimed_trial() TO authenticated, service_role;