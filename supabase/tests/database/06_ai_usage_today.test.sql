-- Reading today's AI usage never counts as a request, and shows only the caller's own numbers.
begin;
select plan(7);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.test');
create function pg_temp.as_user(uid text) returns void language sql as
  $$ select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) $$;

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select (used, daily_limit)::text from public.ai_usage_today()), '(0,20)', 'nothing used yet, and the limit comes from the setting');
select public.consume_ai_request() from generate_series(1, 3);
select is((select used from public.ai_usage_today()), 3, 'three requests used after three requests');
select is((select used from public.ai_usage_today()), 3, 'and reading it again does not change the count');
select ok((select resets_at > now() and resets_at <= now() + interval '25 hours' from public.ai_usage_today()), 'it says when the count resets');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select is((select used from public.ai_usage_today()), 0, 'another user sees their own count');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select allowed from public.consume_ai_request()), true, 'reading did not use up a request');

set local role anon;
select throws_ok($$select * from public.ai_usage_today()$$, '42501', null, 'signed-out callers cannot use it');

select * from finish();
rollback;
