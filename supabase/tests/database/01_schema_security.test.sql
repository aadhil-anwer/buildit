-- Static checks over whole classes of objects: a new table or function that forgets the rules fails here.
begin;
select plan(8);

select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)),
  0, 'every public table has RLS enabled and forced');

select is((select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'),
  0, 'the anon role has no table privileges');

select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'], false)),
  0, 'every security definer function pins search_path to empty');

select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and p.provolatile <> 'v'),
  0, 'every security definer function is volatile (PostgREST runs stable ones read-only)');

select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  0, 'anon cannot execute any public function');

select is((select count(*)::int from information_schema.column_privileges
           where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE')
             and (table_name, column_name) in (('rooms', 'id'), ('rooms', 'owner_id'), ('rooms', 'current_version_id'), ('rooms', 'created_at'),
                                                ('profiles', 'id'), ('profiles', 'created_at'))),
  0, 'sensitive columns (ids, owner, current version, timestamps) have no client write grant');

select is((select count(*)::int from information_schema.role_table_grants
           where table_schema = 'public' and grantee = 'authenticated'
             and table_name in ('ai_usage_daily', 'audit_log', 'admins', 'app_settings', 'room_versions') and privilege_type <> 'SELECT'),
  0, 'internal tables give clients nothing beyond (at most) read access');

select is((select public from storage.buckets where id = 'scans'), false, 'the scans bucket is private');

select * from finish();
rollback;
