# ADR 0001: Arquitectura, base de datos y scripts

- Estado: aprobado
- Fecha: 2026-10-26

## Decisiones

- **Lenguaje:** TypeScript estricto en `client` y `server`. Los tipos de la BD se generan con `npm run db:types`.
- **Supabase:** solo proyecto en la nube (sin Docker). Las migraciones se aplican con `npm run db:push` a un proyecto de desarrollo separado del de entrega.
- **Node:** `>=20.6` (usa `node --env-file`, sin `dotenv`). Verificado con v26.9.0.
- **Monorepo:** npm workspaces (`client`, `server`).

## Seguridad

- Supabase Auth con correo y contraseña. Registro público desactivado: el administrador crea usuarios desde el backend (`auth.admin.createUser`).
- El rol vive en `public.profiles.role` (fuente de verdad). Al crear el usuario también se guarda en `app_metadata` (nunca en `user_metadata`, que el usuario puede editar) solo como respaldo.
- Doble capa: Express valida JWT y rol (`requireRole`) y consulta Supabase con el JWT del usuario, de modo que RLS también aplica.
- `service_role` solo en el servidor: alta/baja de usuarios y endpoints internos de n8n (`/api/internal/*`, con `N8N_API_KEY`).
- Usuario con `profiles.active = false`: `current_app_role()` devuelve `NULL` y todas las políticas fallan.
- El pastor solo ve resumen de donaciones mediante la RPC `donation_summary` (agregados), sin acceso a la tabla.

## Modelo de datos

Enums: `app_role`, `event_type`, `event_category`, `event_status`, `attendance_status`, `donation_concept`, `payment_method`.

Tablas: `profiles`, `church_settings` (singleton), `meeting_schedules`, `members`, `ministries`, `ministry_coordinators`, `ministry_members`, `events`, `event_responsibles`, `attendance`, `donations` (`member_id` nullable), `announcements`.

- Miembros sin `DELETE`: se desactivan con `active = false`.
- Eventos se cancelan con `status = 'cancelled'`; el borrado es solo del administrador.
- Logo en Storage, bucket `church-assets` (lectura pública, escritura administrador).
- RLS activo en todas las tablas; sin política significa denegado.

## Migraciones (una por RF)

1. base (extensión `pg_trgm`, enums, `set_updated_at()`)
2. rf01 profiles (`current_app_role`, `has_role`, `ensure_active_admin`)
3. rf02 members
4. rf10 church_settings (+ bucket)
5. rf05 ministries (políticas de administrador, pastor y secretario)
6. rf04 events
7. rf03 attendance
8. rf06 donations (+ `donation_summary`)
9. rf07 announcements
10. rf08/rf09 reportes (vistas `security_invoker` y RPC)
11. **coordinator_policies** (migración posterior): `is_ministry_coordinator`, `coordinates_member` y todas las políticas del coordinador.

Las políticas del coordinador van en una migración posterior para no bloquear los demás RF.

## Pendiente de validar con el equipo

- Enums de concepto y método de pago (confirmar con un tesorero real).
- Responsables de eventos como **miembros**, no como usuarios, para avisarles sin cuenta.

## Ajustes de RF-01 (2026-11-01)

- `profiles.member_id` se agrega en la migración de RF-02 (`members` aún no existe).
- La migración base solo crea `app_role` y `set_updated_at()`; cada RF crea sus propios enums.
- `authenticate` lee rol y `active` de `profiles` en cada petición, nunca del token.
- Un administrador no puede desactivarse ni cambiarse el rol (API, 409). Siempre debe quedar un admin activo (API y trigger `ensure_active_admin`, error `last_active_admin` traducido a 409).
- Correos en minúsculas (`check (email = lower(email))`).
- Se descarta el trigger `handle_new_user`: fallaba con "El usuario debe crearse con un rol en app_metadata" (P0001) porque en el INSERT sobre `auth.users` aún no estaba `app_metadata`. La migración `20261101000200_rf01_drop_new_user_trigger.sql` elimina el trigger `on_auth_user_created` y la función (las migraciones anteriores no se editan).
- Nuevo flujo de alta (`provisionUser`, usado por el servidor y por `scripts/seed-users.ts`): `auth.admin.createUser` con el rol en `app_metadata` y luego `insert` en `public.profiles` con `service_role` (correo en minúsculas). Si el insert falla se borra el usuario recién creado con `auth.admin.deleteUser`, para no dejar usuarios sin perfil; si el borrado también falla se registra solo el id y el mensaje (nunca la contraseña) y se propaga el error original.
- `profiles` no tiene política de INSERT para usuarios: el alta es exclusiva de `service_role`.
- Un usuario creado desde "Add user" del panel de Supabase queda sin perfil: `authenticate` responde 401 y no puede entrar. El primer admin se crea con `scripts/seed-users.ts`.

## Ajustes de RF-06 (2026-11-01)

- `donations.concept` y `donations.method` son `text` con `check` (no enums `donation_concept` / `payment_method`): el concepto es texto libre de hasta 120 caracteres y el método admite `cash`, `transfer`, `card`, `check`, `other`.
- `donation_summary(p_from, p_to)` (`security definer`, valida el rol dentro): admin y tesorero reciben método y concepto; el **pastor recibe `concept = NULL` y agrupa solo por método**, porque el concepto es texto libre y podría contener datos de una persona. El API devuelve `byConcept: null` para el pastor y la pantalla oculta ese bloque.
- **Excepción a la matriz: `donation_donors()`.** El tesorero no tiene acceso a Miembros (RF-02), pero necesita elegir y ver al donante. La función `security definer` devuelve `id` y `full_name` de **todos** los miembros (incluidos inactivos) solo a admin y tesorero; no expone teléfono, correo ni otros datos. La matriz de permisos no cambia: es un acceso mínimo y acotado, y debe revalidarse con un tesorero real.
- **Borrado real sin auditoría.** La matriz da CRUD a admin y tesorero, así que `DELETE /api/donations/:id` borra la fila de verdad (a diferencia de los miembros, que solo se desactivan). No hay bitácora de cambios ni de borrados: `recorded_by` y `created_at` solo registran quién creó la fila y cuándo, y no se pueden editar desde la app. Riesgo aceptado por ahora; mitigación pendiente: borrado lógico o tabla de auditoría antes de producción.
