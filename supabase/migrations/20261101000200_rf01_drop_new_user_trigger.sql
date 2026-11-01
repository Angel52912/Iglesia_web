-- RF-01: el perfil ya no lo crea un trigger sobre auth.users.
-- handle_new_user fallaba en el INSERT porque raw_app_meta_data aún no traía el rol.
-- Ahora el servidor (y scripts/seed-users.ts) crean el usuario con auth.admin.createUser
-- (rol también en app_metadata) e insertan el perfil con service_role; si el insert del
-- perfil falla, borran el usuario recién creado para no dejar usuarios sin perfil.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- service_role se salta RLS; el permiso de tabla se declara explícito.
grant select, insert, update, delete on public.profiles to service_role;
