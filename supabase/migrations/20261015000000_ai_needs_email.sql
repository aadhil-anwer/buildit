-- The AI designer is for accounts with an email: a guest (anonymous) login is free to mint, so it must not buy more requests.
create or replace function public.consume_ai_request() returns table (allowed boolean, remaining int, daily_limit int, resets_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit int;
  v_tz text;
  v_day date;
  v_count int;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'email required' using errcode = 'P0001'; end if;
  select (value #>> '{}')::int into v_limit from public.app_settings where key = 'ai_daily_limit';
  select value #>> '{}' into v_tz from public.app_settings where key = 'ai_reset_tz';
  v_day := (now() at time zone v_tz)::date;
  insert into public.ai_usage_daily as u (user_id, day, count) values (v_user, v_day, 1)
    on conflict (user_id, day) do update set count = u.count + 1 where u.count < v_limit
    returning u.count into v_count;
  allowed := v_count is not null;
  if v_count is null then
    select u.count into v_count from public.ai_usage_daily u where u.user_id = v_user and u.day = v_day;
  end if;
  remaining := greatest(v_limit - v_count, 0);
  daily_limit := v_limit;
  resets_at := ((v_day + 1)::timestamp at time zone v_tz);
  return next;
end
$$;
