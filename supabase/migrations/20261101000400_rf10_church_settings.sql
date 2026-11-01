-- RF-10: configuración de la iglesia (singleton), horarios habituales y bucket del logotipo.
-- Solo el administrador lee y escribe (matriz de roles). El singleton se siembra aquí y no se borra.

create table public.church_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null check (length(trim(name)) > 0),
  address text check (address is null or length(trim(address)) > 0),
  phone text check (phone is null or length(trim(phone)) > 0),
  email text check (email is null or email = lower(email)),
  logo_path text check (logo_path is null or length(trim(logo_path)) > 0),
  updated_at timestamptz not null default now()
);

insert into public.church_settings (id, name) values (1, 'Mi iglesia');

create trigger church_settings_set_updated_at
  before update on public.church_settings
  for each row execute function public.set_updated_at();

create table public.meeting_schedules (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(trim(label)) > 0),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  created_at timestamptz not null default now()
);

create index meeting_schedules_weekday_idx on public.meeting_schedules (weekday, start_time);

alter table public.church_settings enable row level security;
alter table public.meeting_schedules enable row level security;

revoke all on public.church_settings from anon, authenticated;
grant select on public.church_settings to authenticated;
grant update (name, address, phone, email, logo_path) on public.church_settings to authenticated;

revoke all on public.meeting_schedules from anon, authenticated;
grant select, insert, delete on public.meeting_schedules to authenticated;
grant update (label, weekday, start_time) on public.meeting_schedules to authenticated;

create policy church_settings_select on public.church_settings
  for select to authenticated using (public.has_role('admin'));

create policy church_settings_update on public.church_settings
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy meeting_schedules_select on public.meeting_schedules
  for select to authenticated using (public.has_role('admin'));

create policy meeting_schedules_insert on public.meeting_schedules
  for insert to authenticated with check (public.has_role('admin'));

create policy meeting_schedules_update on public.meeting_schedules
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy meeting_schedules_delete on public.meeting_schedules
  for delete to authenticated using (public.has_role('admin'));

-- Logotipo: lectura pública (bucket público), escritura solo administrador.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('church-assets', 'church-assets', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']);

create policy church_assets_select on storage.objects
  for select to authenticated
  using (bucket_id = 'church-assets' and public.has_role('admin'));

create policy church_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'church-assets' and public.has_role('admin'));

create policy church_assets_update on storage.objects
  for update to authenticated
  using (bucket_id = 'church-assets' and public.has_role('admin'))
  with check (bucket_id = 'church-assets' and public.has_role('admin'));

create policy church_assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'church-assets' and public.has_role('admin'));
