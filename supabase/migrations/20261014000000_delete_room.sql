-- Deleting a room: its versions go with it (on delete cascade), scans keep their file but lose the link.
-- A function, not a client delete grant, so ownership is checked in one place and a stranger's room looks like "not found".
create function public.delete_room(p_room_id uuid) returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  delete from public.rooms where id = p_room_id and owner_id = auth.uid();
  if not found then raise exception 'room not found' using errcode = 'P0002'; end if;
end
$$;

revoke execute on function public.delete_room(uuid) from public, anon;
grant execute on function public.delete_room(uuid) to authenticated;
