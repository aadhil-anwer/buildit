-- Deleting a room: only the owner can, its versions go too, and a stranger is told "not found".
begin;
select plan(8);

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
select lives_ok($$select public.save_version((select v::uuid from ids where k = 'room'), pg_temp.scene(), 'manual', 'Keep')$$, 'and saves a version');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select throws_ok($$select public.delete_room((select v::uuid from ids where k = 'room'))$$, 'P0002', 'room not found', 'B cannot delete A''s room, and is told "not found"');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select count(*)::int from public.rooms), 1, 'so A''s room is still there');
select lives_ok($$select public.delete_room((select v::uuid from ids where k = 'room'))$$, 'A deletes their room');
select is((select count(*)::int from public.rooms), 0, 'the room is gone');
select is((select count(*)::int from public.room_versions), 0, 'and so are its versions');
select throws_ok($$select public.delete_room((select v::uuid from ids where k = 'room'))$$, 'P0002', 'room not found', 'deleting it again says "not found" (so a second phone can treat that as done)');

select * from finish();
rollback;
