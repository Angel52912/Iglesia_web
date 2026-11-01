-- RF-04: eventos y sus responsables (miembros, para poder avisarles aunque no tengan cuenta).
-- Lectura: admin, pastor, secretario, tesorero. Escritura: admin, pastor, secretario.
-- Los eventos no se eliminan desde la app: se cancelan (status = 'cancelled'). Sin GRANT de DELETE.
-- Las políticas del coordinador (crear los de su ministerio) van en la migración coordinator_policies.

create type public.event_type as enum ('religious', 'administrative');
create type public.event_category as enum ('worship', 'meeting', 'activity');
create type public.event_status as enum ('scheduled', 'cancelled');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text check (description is null or length(trim(description)) > 0),
  event_date date not null,
  start_time time not null,
  location text check (location is null or length(trim(location)) > 0),
  type public.event_type not null,
  category public.event_category not null,
  status public.event_status not null default 'scheduled',
  ministry_id uuid references public.ministries (id),
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_date_idx on public.events (event_date, start_time);
create index events_ministry_idx on public.events (ministry_id);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_responsibles (
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id),
  primary key (event_id, member_id)
);

create index event_responsibles_member_idx on public.event_responsibles (member_id);

alter table public.events enable row level security;
alter table public.event_responsibles enable row level security;

revoke all on public.events from anon, authenticated;
grant select, insert on public.events to authenticated;
grant update (title, description, event_date, start_time, location, type, category, status, ministry_id)
  on public.events to authenticated;

revoke all on public.event_responsibles from anon, authenticated;
grant select, insert, delete on public.event_responsibles to authenticated;

create policy events_select on public.events
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary', 'treasurer'));

create policy events_insert on public.events
  for insert to authenticated
  with check (public.has_role('admin', 'pastor', 'secretary'));

create policy events_update on public.events
  for update to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'))
  with check (public.has_role('admin', 'pastor', 'secretary'));

create policy event_responsibles_select on public.event_responsibles
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary', 'treasurer'));

create policy event_responsibles_insert on public.event_responsibles
  for insert to authenticated
  with check (public.has_role('admin', 'pastor', 'secretary'));

create policy event_responsibles_delete on public.event_responsibles
  for delete to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));
