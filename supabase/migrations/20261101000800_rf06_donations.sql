-- RF-06: donaciones y aportaciones.
-- Tabla: solo admin y tesorero (CRUD). El pastor NO lee filas: solo el resumen agregado
-- (donation_summary). Secretario y coordinador no tienen acceso.
-- member_id es nullable: una donación anónima no se asocia a nadie.

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id),
  donated_on date not null,
  amount numeric(12, 2) not null check (amount > 0),
  concept text not null check (char_length(btrim(concept)) between 1 and 120),
  method text not null check (method in ('cash', 'transfer', 'card', 'check', 'other')),
  recorded_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index donations_donated_on_idx on public.donations (donated_on);
create index donations_member_idx on public.donations (member_id);

create trigger donations_set_updated_at
  before update on public.donations
  for each row execute function public.set_updated_at();

alter table public.donations enable row level security;

revoke all on public.donations from anon, authenticated;
grant select, insert, delete on public.donations to authenticated;
-- recorded_by y created_at no se pueden cambiar desde la app.
grant update (member_id, donated_on, amount, concept, method) on public.donations to authenticated;

create policy donations_select on public.donations
  for select to authenticated
  using (public.has_role('admin', 'treasurer'));

create policy donations_insert on public.donations
  for insert to authenticated
  with check (public.has_role('admin', 'treasurer'));

create policy donations_update on public.donations
  for update to authenticated
  using (public.has_role('admin', 'treasurer'))
  with check (public.has_role('admin', 'treasurer'));

create policy donations_delete on public.donations
  for delete to authenticated
  using (public.has_role('admin', 'treasurer'));

-- Resumen agregado (sin donantes ni filas individuales) para admin, pastor y tesorero.
-- security definer porque el pastor no puede leer la tabla; el rol se valida dentro.
-- concept es texto libre y podría contener datos de una persona: solo admin y tesorero lo
-- reciben. Para el pastor concept es NULL y se agrupa únicamente por método.
create function public.donation_summary(p_from date, p_to date)
returns table (method text, concept text, total numeric, donations bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin', 'pastor', 'treasurer') then
    raise exception 'No tienes permiso para ver el resumen de donaciones'
      using errcode = '42501';
  end if;
  if public.has_role('admin', 'treasurer') then
    return query
      select d.method, d.concept, sum(d.amount), count(*)
      from public.donations d
      where d.donated_on between p_from and p_to
      group by d.method, d.concept;
  else
    return query
      select d.method, null::text, sum(d.amount), count(*)
      from public.donations d
      where d.donated_on between p_from and p_to
      group by d.method;
  end if;
end
$$;

-- Nombres de miembros para elegir y mostrar al donante. El tesorero no puede leer members
-- (matriz de permisos), así que solo se expone id y nombre, y solo a admin y tesorero.
create function public.donation_donors()
returns table (id uuid, full_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin', 'treasurer') then
    raise exception 'No tienes permiso para ver los donantes'
      using errcode = '42501';
  end if;
  return query select m.id, m.full_name from public.members m order by m.full_name;
end
$$;

revoke all on function public.donation_summary(date, date) from public, anon;
revoke all on function public.donation_donors() from public, anon;
grant execute on function public.donation_summary(date, date) to authenticated;
grant execute on function public.donation_donors() to authenticated;
