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
- El rol vive en `public.profiles.role`; el trigger de alta lo lee de `raw_app_meta_data`, nunca de `user_metadata`.
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
2. rf01 profiles (`handle_new_user`, `current_app_role`, `has_role`)
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
