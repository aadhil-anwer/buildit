-- Version history: nothing is ever lost, bad scenes are rejected, autosaves are pruned but saved versions are not.
begin;
select plan(10);

create temp table ids (k text primary key, v text);
grant all on ids to authenticated;
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test');
create function pg_temp.as_user(uid text) returns void language sql as
  $$ select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) $$;
create function pg_temp.scene(extra text default '') returns jsonb language sql as
  $$ select ('{"version":1,"id":"s' || extra || '","room":{"name":"T","corners":[{"x":0,"z":0},{"x":4,"z":0},{"x":4,"z":3},{"x":0,"z":3}],"height":2.8,"openings":[],"floorColor":"#cdbca3","wallColor":"#efe9e0"},"objects":[],"constraints":{"minWalkway":0.8}}')::jsonb $$;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into ids select 'room', public.create_room('Bedroom', pg_temp.scene('-1'))::text;

select is((select count(*)::int from public.room_versions), 1, 'creating a room saves its first version');
select is((select current_version_id from public.rooms), (select id from public.room_versions), 'and makes it the current version');

insert into ids select 'manual', public.save_version((select v::uuid from ids where k = 'room'), pg_temp.scene('-2'), 'manual', 'Before the AI')::text;
select is((select current_version_id::text from public.rooms), (select v from ids where k = 'manual'), 'saving a version makes it current');

insert into ids select 'restored', public.restore_version((select id from public.room_versions where scene->>'id' = 's-1'))::text;
select is((select scene->>'id' from public.room_versions where id = (select v::uuid from ids where k = 'restored')), 's-1', 'restoring copies the old scene into a new version');
select is((select count(*)::int from public.room_versions), 3, 'and nothing is lost: the history only grows');

select throws_ok($$select public.save_version((select v::uuid from ids where k = 'room'), '{}'::jsonb, 'manual', null)$$, '22023', 'invalid scene', 'a scene without a room is rejected');
select throws_ok($$select public.save_version((select v::uuid from ids where k = 'room'), jsonb_set(pg_temp.scene(), '{id}', to_jsonb(repeat('x', 300000))), 'manual', null)$$, '22023', 'invalid scene', 'an oversized scene is rejected');
select throws_ok($$select public.save_version((select v::uuid from ids where k = 'room'), pg_temp.scene(), 'hacked', null)$$, '22023', 'invalid kind', 'an unknown kind is rejected');

select public.save_version((select v::uuid from ids where k = 'room'), pg_temp.scene('-a' || g), 'autosave', null) from generate_series(1, 60) g;
select is((select count(*)::int from public.room_versions where kind = 'autosave'), 50, 'autosaves are pruned to the newest 50');
select is((select count(*)::int from public.room_versions where kind = 'manual'), 2, 'while manual versions and restores are always kept');

select * from finish();
rollback;
