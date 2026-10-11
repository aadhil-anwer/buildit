-- Two users, one room each: nobody can see or change anyone else's data, and failures look like "not found".
begin;
select plan(16);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.test');
create function pg_temp.as_user(uid text) returns void language sql as
  $$ select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) $$;
create function pg_temp.scene() returns jsonb language sql as
  $$ select '{"version":1,"id":"s","room":{"name":"T","corners":[{"x":0,"z":0},{"x":4,"z":0},{"x":4,"z":3},{"x":0,"z":3}],"height":2.8,"openings":[],"floorColor":"#cdbca3","wallColor":"#efe9e0"},"objects":[],"constraints":{"minWalkway":0.8}}'::jsonb $$;

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok($$insert into ids select 'room', public.create_room('Bedroom', pg_temp.scene())::text$$, 'A creates a room');
select is((select count(*)::int from public.rooms), 1, 'A sees their room');
select lives_ok($$insert into ids select 'version', id::text from public.room_versions limit 1$$, 'A can read their version');
select lives_ok($$update public.rooms set name = 'Guest room'$$, 'A can rename their room');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.rooms), 0, 'B sees none of A''s rooms');
select is((select count(*)::int from public.room_versions), 0, 'B sees none of A''s versions');
select lives_ok($$update public.rooms set name = 'Mine now'$$, 'B''s attempt to rename A''s room runs but matches nothing');
select lives_ok($$delete from public.rooms$$, 'B''s attempt to delete A''s room runs but matches nothing');
select throws_ok($$select public.save_version((select v::uuid from ids where k = 'room'), pg_temp.scene(), 'manual', null)$$, 'P0002', 'room not found', 'B cannot save into A''s room, and is told "not found"');
select throws_ok($$select public.restore_version((select v::uuid from ids where k = 'version'))$$, 'P0002', 'version not found', 'B cannot restore A''s version');
select throws_ok($$insert into public.rooms (name) values ('x')$$, '42501', null, 'clients cannot insert rooms directly (only via create_room)');
select throws_ok($$update public.rooms set owner_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$, '42501', null, 'owner_id has no client write grant');

reset role;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select name from public.rooms), 'Guest room', 'so A''s room kept its name');
select is((select count(*)::int from public.rooms), 1, 'and still exists');
select throws_ok($$update public.room_versions set label = 'edited'$$, '42501', null, 'versions are immutable for clients');

set local role anon;
select throws_ok($$select count(*) from public.rooms$$, '42501', null, 'anonymous (signed-out) callers have no access at all');

select * from finish();
rollback;
