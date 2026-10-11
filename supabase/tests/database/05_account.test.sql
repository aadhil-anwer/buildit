-- Profiles are created with sane defaults, validated on write, and deleting an account removes everything of the user's.
begin;
select plan(10);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.test');
create function pg_temp.as_user(uid text) returns void language sql as
  $$ select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) $$;
create function pg_temp.scene() returns jsonb language sql as
  $$ select '{"version":1,"id":"s","room":{"name":"T","corners":[{"x":0,"z":0},{"x":4,"z":0},{"x":4,"z":3},{"x":0,"z":3}],"height":2.8,"openings":[],"floorColor":"#cdbca3","wallColor":"#efe9e0"},"objects":[],"constraints":{"minWalkway":0.8}}'::jsonb $$;

select is((select (language, walkway_pref_cm)::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), '(en,90)', 'a profile appears with English and a 90 cm walkway');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok($$update public.profiles set language = 'ar', walkway_pref_cm = 75$$, 'users can change their language and walkway preference');
select throws_ok($$update public.profiles set language = 'fr'$$, '23514', null, 'an unsupported language is rejected');
select throws_ok($$update public.profiles set walkway_pref_cm = 80$$, '23514', null, 'only 75 or 90 cm walkways are allowed');
select is((select count(*)::int from public.profiles), 1, 'users see only their own profile');

insert into ids select 'room', public.create_room('Bedroom', pg_temp.scene())::text;
select lives_ok($$select public.delete_account()$$, 'a user can delete their account');

reset role;
select is((select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'the login is gone');
select is((select count(*)::int from public.rooms r where r.owner_id = 'aaaaaaaa-0000-0000-0000-000000000001') + (select count(*)::int from public.room_versions where room_id = (select v::uuid from ids where k = 'room')) + (select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'and so are their profile, rooms and versions');
select is((select count(*)::int from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), 1, 'other users are untouched');
select is((select count(*)::int from public.audit_log where action = 'delete_account' and target = 'aaaaaaaa-0000-0000-0000-000000000001' and detail = '{}'::jsonb), 1, 'the deletion is audited, with no personal data in the entry');

select * from finish();
rollback;
