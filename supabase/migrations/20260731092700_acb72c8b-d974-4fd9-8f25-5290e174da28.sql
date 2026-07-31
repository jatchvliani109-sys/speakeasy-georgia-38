create or replace function public.consume_ai_session(
  p_user_id uuid,
  p_week    text,
  p_limit   int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_state jsonb;
  cur_week  text;
  cur_used  int;
begin
  select state into cur_state
  from business_state
  where user_id = p_user_id
  for update;

  if cur_state is null then
    cur_state := '{}'::jsonb;
  end if;

  cur_week := cur_state->>'aiWeekKey';
  cur_used := coalesce(nullif(cur_state->>'aiUsedWeek','')::int, 0);

  if cur_week is distinct from p_week then
    cur_used := 0;
  end if;

  if cur_used >= p_limit then
    return json_build_object('ok', false, 'remaining', 0, 'limit', p_limit);
  end if;

  cur_state := jsonb_set(
                 jsonb_set(cur_state, '{aiWeekKey}',  to_jsonb(p_week)),
                 '{aiUsedWeek}', to_jsonb(cur_used + 1)
               );

  insert into business_state (user_id, state)
  values (p_user_id, cur_state)
  on conflict (user_id) do update set state = cur_state;

  return json_build_object('ok', true, 'remaining', p_limit - cur_used - 1, 'limit', p_limit);
end;
$$;

revoke all on function public.consume_ai_session(uuid, text, int) from public, anon, authenticated;
grant execute on function public.consume_ai_session(uuid, text, int) to service_role;

create or replace function public.refund_ai_session(p_user_id uuid, p_week text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_state jsonb;
  cur_used  int;
begin
  select state into cur_state from business_state where user_id = p_user_id for update;
  if cur_state is null then return; end if;
  if cur_state->>'aiWeekKey' is distinct from p_week then return; end if;
  cur_used := coalesce(nullif(cur_state->>'aiUsedWeek','')::int, 0);
  if cur_used <= 0 then return; end if;
  cur_state := jsonb_set(cur_state, '{aiUsedWeek}', to_jsonb(cur_used - 1));
  update business_state set state = cur_state where user_id = p_user_id;
end;
$$;

revoke all on function public.refund_ai_session(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_ai_session(uuid, text) to service_role;