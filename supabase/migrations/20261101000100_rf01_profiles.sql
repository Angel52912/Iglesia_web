-- RF-01: perfiles de usuario, rol y funciones auxiliares para RLS.
-- El registro público debe estar DESACTIVADO en Supabase (Authentication > Providers > Email > "Allow new users to sign up" = off).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null unique check (email = lower(email)),
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Rol del usuario actual; NULL si no existe o está desactivado (todas las políticas fallan).
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.active
$$;

create function public.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = any (roles), false)
$$;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.has_role(public.app_role[]) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_role(public.app_role[]) to authenticated;

-- Alta de perfil al crear un usuario en auth.users.
-- El rol se lee SOLO de raw_app_meta_data (user_metadata lo puede editar el propio usuario).
-- Sin rol válido el alta falla: nunca se asigna un rol por defecto (menos aún admin).
-- Por eso "Add user" del panel de Supabase falla (no permite app_metadata): es lo esperado.
-- Los usuarios se crean con la API del servidor y el primer admin con scripts/seed-users.ts.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') = '' then
    raise exception 'El usuario debe crearse con un rol en app_metadata (usa la API del servidor)';
  end if;

  v_role := (new.raw_app_meta_data ->> 'role')::public.app_role;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), lower(new.email)),
    lower(new.email),
    v_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Siempre debe quedar al menos un administrador activo.
create function public.ensure_active_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active) then
    -- Bloquea a los demás admins activos para evitar que dos cambios simultáneos dejen cero.
    perform 1 from public.profiles
      where role = 'admin' and active and id <> old.id
      for update;
    if not found then
      raise exception 'last_active_admin' using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger profiles_ensure_active_admin
  before update or delete on public.profiles
  for each row execute function public.ensure_active_admin();

-- RLS: sin política = denegado. Alta y baja solo con service_role (backend).
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, role, active) on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.has_role('admin'));

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));
