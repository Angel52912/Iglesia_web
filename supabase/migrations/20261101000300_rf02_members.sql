-- RF-02: miembros de la iglesia.
-- Los miembros no se eliminan: se desactivan (active = false). Sin política ni GRANT de DELETE.
-- Lectura: admin, pastor, secretario. Escritura: admin, secretario.
-- Las políticas del coordinador (lectura de su ministerio) van en la migración coordinator_policies.

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text check (phone is null or length(trim(phone)) > 0),
  email text check (email is null or email = lower(email)),
  joined_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_full_name_idx on public.members (lower(full_name));
create index members_active_idx on public.members (active);

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

alter table public.members enable row level security;

revoke all on public.members from anon, authenticated;
grant select, insert on public.members to authenticated;
grant update (full_name, phone, email, joined_on, active) on public.members to authenticated;

create policy members_select on public.members
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));

create policy members_insert on public.members
  for insert to authenticated
  with check (public.has_role('admin', 'secretary'));

create policy members_update on public.members
  for update to authenticated
  using (public.has_role('admin', 'secretary'))
  with check (public.has_role('admin', 'secretary'));
