-- Base compartida: rol de aplicación y trigger genérico de updated_at.

create type public.app_role as enum ('admin', 'pastor', 'secretary', 'treasurer', 'coordinator');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
