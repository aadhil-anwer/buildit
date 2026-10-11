-- The daily AI cap is enforced in the database, atomically, from a server-side setting.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.test');
create function pg_temp.as_user(uid text) returns void language sql as
  $$ select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) $$;

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select (allowed, remaining, daily_limit)::text from public.consume_ai_request()), '(t,19,20)', 'the first request leaves 19 of 20');
select public.consume_ai_request() from generate_series(1, 18);
select is((select (allowed, remaining)::text from public.consume_ai_request()), '(t,0)', 'the 20th request is allowed and leaves none');
select is((select (allowed, remaining)::text from public.consume_ai_request()), '(f,0)', 'the 21st is refused');
select ok((select resets_at > now() and resets_at <= now() + interval '25 hours' from public.consume_ai_request()), 'and says when the count resets');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select is((select (allowed, remaining)::text from public.consume_ai_request()), '(t,19)', 'another user''s count is separate');

reset role;
update public.app_settings set value = '2' where key = 'ai_daily_limit';
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000003', 'c@example.test');
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select public.consume_ai_request() from generate_series(1, 2);
select is((select allowed from public.consume_ai_request()), false, 'the limit comes from a server-side setting');

select throws_ok($$select * from public.ai_usage_daily$$, '42501', null, 'clients cannot read usage rows');
select throws_ok($$update public.app_settings set value = '9999' where key = 'ai_daily_limit'$$, '42501', null, 'clients cannot change the limit');
set local role anon;
select throws_ok($$select public.consume_ai_request()$$, '42501', null, 'signed-out callers cannot use it');

select * from finish();
rollback;
