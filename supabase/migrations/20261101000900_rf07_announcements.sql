-- RF-07: comunicados y anuncios.
-- Lectura: admin, pastor, secretario, coordinador. Escritura (crear, editar, eliminar): admin, pastor, secretario.
-- El tesorero no tiene acceso. Se pueden eliminar (RF-07 lo pide), a diferencia de miembros y eventos.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  important boolean not null default false,
  published_on date not null default current_date,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_published_idx on public.announcements (published_on desc, created_at desc);

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

revoke all on public.announcements from anon, authenticated;
grant select, insert, delete on public.announcements to authenticated;
-- created_by y created_at no se pueden cambiar desde la app.
grant update (title, body, important, published_on) on public.announcements to authenticated;

create policy announcements_select on public.announcements
  for select to authenticated
  using (public.has_role('admin', 'pastor', 'secretary', 'coordinator'));

create policy announcements_insert on public.announcements
  for insert to authenticated
  with check (public.has_role('admin', 'pastor', 'secretary'));

create policy announcements_update on public.announcements
  for update to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'))
  with check (public.has_role('admin', 'pastor', 'secretary'));

create policy announcements_delete on public.announcements
  for delete to authenticated
  using (public.has_role('admin', 'pastor', 'secretary'));
