-- RF-05: ministerios, sus coordinadores y sus integrantes (ambos son miembros).
-- Lectura: admin, pastor, secretario. Escritura: admin, pastor.
-- Los ministerios no se eliminan: se desactivan (active = false). Sin política ni GRANT de DELETE.
-- Las políticas del coordinador (gestionar el suyo) van en la migración coordinator_policies.

create table public.ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text check (description is null or length(trim(description)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ministries_name_key on public.ministries (lower(name));

create trigger ministries_set_updated_at
  before update on public.ministries
  for each row execute function public.set_updated_at();

create table public.ministry_coordinators (
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  member_id uuid not null references public.members (id),
  primary key (ministry_id, member_id)
);

create table public.ministry_members (
  ministry_id uuid not null references public.ministries (id) on delete cascade,
  member_id uuid not null references public.members (id),
  joined_at timestamptz not null default now(),
  primary key (ministry_id, member_id)
);

create index ministry_coordinators_member_idx on public.ministry_coordinators (member_id);
create index ministry_members_member_idx on public.ministry_members (member_id);

alter table public.ministries enable row level security;
alter table public.ministry_coordinators enable row level security;
alter table public.ministry_members enable row level security;

revoke all on public.ministries from anon, authenticated;
grant select, insert on public.ministries to authenticated;
grant update (name, description, active) on public.ministries to authenticated;

revoke all on public.ministry_coordinators from anon, authenticated;
grant select, insert, delete on public.ministry_coordinators to authenticated;

revoke all on public.ministry_members from anon, authenticated;
grant select, insert, delete on public.ministry_members to authenticated;

create policy ministries_select on public.ministries
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));

create policy ministries_insert on public.ministries
  for insert to authenticated
  with check (public.has_role('admin', 'pastor'));

create policy ministries_update on public.ministries
  for update to authenticated
  using (public.has_role('admin', 'pastor'))
  with check (public.has_role('admin', 'pastor'));

create policy ministry_coordinators_select on public.ministry_coordinators
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));

create policy ministry_coordinators_insert on public.ministry_coordinators
  for insert to authenticated
  with check (public.has_role('admin', 'pastor'));

create policy ministry_coordinators_delete on public.ministry_coordinators
  for delete to authenticated
  using (public.has_role('admin', 'pastor'));

create policy ministry_members_select on public.ministry_members
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));

create policy ministry_members_insert on public.ministry_members
  for insert to authenticated
  with check (public.has_role('admin', 'pastor'));

create policy ministry_members_delete on public.ministry_members
  for delete to authenticated
  using (public.has_role('admin', 'pastor'));
