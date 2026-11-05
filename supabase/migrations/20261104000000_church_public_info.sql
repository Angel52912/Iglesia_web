-- Datos públicos de la iglesia (nombre, logotipo, dirección y correo de contacto) visibles
-- para cualquier usuario con sesión. church_settings sigue siendo solo del administrador:
-- esta función expone únicamente esos cuatro campos (sin teléfono ni horarios).

create or replace function public.church_public_info()
returns table (name text, address text, email text, logo_path text)
language sql
stable
security definer
set search_path = public
as $$
  select name, address, email, logo_path
  from public.church_settings
  where id = 1;
$$;

revoke all on function public.church_public_info() from public, anon;
grant execute on function public.church_public_info() to authenticated;
