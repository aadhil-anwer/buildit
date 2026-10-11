-- Read-only view of today's AI usage for the Settings screen. Unlike consume_ai_request it never counts a request.
create function public.ai_usage_today() returns table (used int, daily_limit int, resets_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tz text;
  v_day date;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select (value #>> '{}')::int into daily_limit from public.app_settings where key = 'ai_daily_limit';
  select value #>> '{}' into v_tz from public.app_settings where key = 'ai_reset_tz';
  v_day := (now() at time zone v_tz)::date;
  select coalesce(max(u.count), 0) into used from public.ai_usage_daily u where u.user_id = v_user and u.day = v_day;
  resets_at := ((v_day + 1)::timestamp at time zone v_tz);
  return next;
end
$$;

revoke execute on function public.ai_usage_today() from public, anon, authenticated;
grant execute on function public.ai_usage_today() to authenticated;
