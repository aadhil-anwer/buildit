-- Core schema: profiles, rooms, room versions, scans, AI usage, audit.
-- Deny by default: every table has RLS enabled and forced, clients get nothing until granted back column by column.

-- Anything created later in `public` starts with no client access.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Server-side settings (the daily AI cap and the time zone its day follows). No client access.
create table public.app_settings (key text primary key, value jsonb not null);
insert into public.app_settings values ('ai_daily_limit', '20'), ('ai_reset_tz', '"Asia/Muscat"');

-- A scene is plain JSON written by the app. The database only checks its shape and size;
-- the engine and zod in the app check the content.
create function public.is_valid_scene(p jsonb) returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and p->>'version' = '1'
    and jsonb_typeof(p->'room') = 'object'
    and case when jsonb_typeof(p->'room'->'corners') = 'array' then jsonb_array_length(p->'room'->'corners') between 3 and 64 else false end
    and case when jsonb_typeof(p->'objects') = 'array' then jsonb_array_length(p->'objects') <= 300 else false end
    and octet_length(p::text) <= 262144
$$;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  language text not null default 'en' check (language in ('en', 'ar')),
  walkway_pref_cm int not null default 90 check (walkway_pref_cm in (75, 90)),
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rooms_owner_idx on public.rooms (owner_id);

create table public.room_versions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  scene jsonb not null check (public.is_valid_scene(scene)),
  kind text not null check (kind in ('autosave', 'manual', 'ai', 'restore')),
  label text check (char_length(label) <= 120),
  created_at timestamptz not null default clock_timestamp()
);
create index room_versions_room_idx on public.room_versions (room_id, created_at desc);
alter table public.rooms add constraint rooms_current_version_fk
  foreign key (current_version_id) references public.room_versions (id) on delete set null;

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  room_id uuid references public.rooms on delete set null,
  kind text not null check (kind in ('lidar', 'guided')),
  storage_path text not null check (storage_path like owner_id::text || '/%'),
  created_at timestamptz not null default now()
);
create index scans_owner_idx on public.scans (owner_id);

create table public.ai_usage_daily (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

-- Audit rows outlive the user they describe, so `actor` is not a foreign key.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  target text,
  detail jsonb not null default '{}'
);

-- Membership table for admin tools. Never client-writable; no admin features yet.
create table public.admins (user_id uuid primary key references auth.users on delete cascade);

-- RLS on and forced everywhere. Tables without policies below are closed to clients entirely.
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_versions enable row level security;
alter table public.scans enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.audit_log enable row level security;
alter table public.admins enable row level security;
alter table public.app_settings force row level security;
alter table public.profiles force row level security;
alter table public.rooms force row level security;
alter table public.room_versions force row level security;
alter table public.scans force row level security;
alter table public.ai_usage_daily force row level security;
alter table public.audit_log force row level security;
alter table public.admins force row level security;

-- Supabase hands new tables to the client roles by default; take it all back, then grant per column with a reason.
revoke all on public.app_settings, public.profiles, public.rooms, public.room_versions, public.scans,
  public.ai_usage_daily, public.audit_log, public.admins from anon, authenticated;

create policy profiles_own_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy rooms_own_select on public.rooms for select to authenticated using (owner_id = auth.uid());
create policy rooms_own_update on public.rooms for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy rooms_own_delete on public.rooms for delete to authenticated using (owner_id = auth.uid());
create policy versions_own_select on public.room_versions for select to authenticated
  using (exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid()));
create policy scans_own_select on public.scans for select to authenticated using (owner_id = auth.uid());

grant select on public.profiles, public.rooms, public.room_versions, public.scans to authenticated;
grant update (language, walkway_pref_cm) on public.profiles to authenticated; -- the user's own settings
grant update (name) on public.rooms to authenticated;                         -- rename; everything else goes through functions
grant delete on public.rooms to authenticated;                                -- versions follow by cascade

-- A profile appears with every new login (Apple, email or anonymous).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
create trigger rooms_touch before update on public.rooms for each row execute function public.touch_updated_at();

-- All writes that change state go through these functions. Each re-checks ownership itself
-- and answers "not found" (never "forbidden") so a stranger cannot tell what exists.

create function public.create_room(p_name text, p_scene jsonb) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room uuid;
  v_version uuid;
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if not public.is_valid_scene(p_scene) then raise exception 'invalid scene' using errcode = '22023'; end if;
  insert into public.rooms (owner_id, name) values (v_user, p_name) returning id into v_room;
  insert into public.room_versions (room_id, scene, kind) values (v_room, p_scene, 'manual') returning id into v_version;
  update public.rooms set current_version_id = v_version where id = v_room;
  return v_room;
end
$$;

create function public.save_version(p_room_id uuid, p_scene jsonb, p_kind text default 'autosave', p_label text default null) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare v_version uuid;
begin
  if p_kind not in ('autosave', 'manual', 'ai') then raise exception 'invalid kind' using errcode = '22023'; end if;
  if not public.is_valid_scene(p_scene) then raise exception 'invalid scene' using errcode = '22023'; end if;
  perform 1 from public.rooms where id = p_room_id and owner_id = auth.uid() for update;
  if not found then raise exception 'room not found' using errcode = 'P0002'; end if;
  insert into public.room_versions (room_id, scene, kind, label) values (p_room_id, p_scene, p_kind, p_label) returning id into v_version;
  update public.rooms set current_version_id = v_version where id = p_room_id;
  -- Keep the newest 50 autosaves; saved, AI and restored versions are never pruned.
  delete from public.room_versions
   where room_id = p_room_id and kind = 'autosave'
     and id not in (select id from public.room_versions where room_id = p_room_id and kind = 'autosave' order by created_at desc, id desc limit 50);
  return v_version;
end
$$;

-- Restoring never rewrites history: it adds a new version holding the old scene.
create function public.restore_version(p_version_id uuid) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v public.room_versions;
  v_new uuid;
begin
  select rv.* into v from public.room_versions rv join public.rooms r on r.id = rv.room_id
   where rv.id = p_version_id and r.owner_id = auth.uid();
  if not found then raise exception 'version not found' using errcode = 'P0002'; end if;
  insert into public.room_versions (room_id, scene, kind, label) values (v.room_id, v.scene, 'restore', v.label) returning id into v_new;
  update public.rooms set current_version_id = v_new where id = v.room_id;
  return v_new;
end
$$;

-- Atomic: one statement both counts and enforces the cap, so parallel requests cannot overshoot it.
create function public.consume_ai_request() returns table (allowed boolean, remaining int, daily_limit int, resets_at timestamptz)
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

-- Removes the login and, by cascade, everything of the user's. The audit entry holds only the id.
-- Files in storage are not removed here (see OPEN_ISSUES.md).
create function public.delete_account() returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.audit_log (actor, action, target) values (v_user, 'delete_account', v_user::text);
  delete from auth.users where id = v_user;
end
$$;

-- Only signed-in users may call the functions; nobody calls the helpers directly.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_room(text, jsonb), public.save_version(uuid, jsonb, text, text),
  public.restore_version(uuid), public.consume_ai_request(), public.delete_account() to authenticated;

-- Scans live in a private bucket, one folder per user.
insert into storage.buckets (id, name, public) values ('scans', 'scans', false) on conflict (id) do nothing;
create policy scans_own_read on storage.objects for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
create policy scans_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
create policy scans_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
