# Sistema de Gestión de Iglesia

Aplicación web (PWA) para administrar una iglesia: miembros, asistencia, eventos,
ministerios, donaciones, comunicados, dashboard y reportes.

- Equipo: 4 personas. Entrega del proyecto: **3 de noviembre de 2026**. Diseño en Figma: **12 de noviembre de 2026**.
- Requisitos completos y checklist: `docs/requisitos.md` (léelo antes de implementar cualquier RF).
- Decisiones de arquitectura: `docs/decisiones/0001-arquitectura.md`.

## Stack

- Lenguaje: **TypeScript estricto** en client y server (sin `any`).
- Frontend: React + Vite, configurado como PWA (manifest + service worker)
- Backend: Node.js (>= 20.6) + Express
- Base de datos y auth: Supabase (PostgreSQL), **solo proyecto en la nube** (sin Docker)
- Automatización: n8n (flujos exportados en `/n8n`)
- Reportes: PDF y Excel exportables desde el backend

## Estructura

```
/client        # React + Vite + TS (PWA)
/server        # API Express + TS
/supabase      # migraciones SQL y seeds
/n8n           # flujos exportados (.json)
/scripts       # utilidades (gen-db-types.mjs, seed-users.ts)
/docs          # requisitos, análisis, decisiones (ADR)
```

Monorepo con npm workspaces (`client`, `server`). Cada módulo del backend vive en
`server/src/modules/<modulo>/` (routes, controller, service, schemas) y del frontend en
`client/src/features/<modulo>/`.

## Comandos

Desde la raíz:

- Instalar: `npm install`
- Desarrollo (client + server): `npm run dev`
- Build: `npm run build`
- Pruebas: `npm test` (Vitest; E2E con Playwright se agrega cuando haga falta)
- Lint: `npm run lint` — Tipos: `npm run typecheck` — Formato: `npm run format`
- Base de datos: `npm run db:link`, `npm run db:new <nombre>`, `npm run db:push`
- Tipos de la BD: `npm run db:types` (script Node multiplataforma, salida UTF-8)
- Usuarios de prueba (uno por rol): `npm run db:seed-users`

Variables de entorno: copiar `.env.example` a `.env` en la raíz, `client/` y `server/`.

## Roles y permisos (propuesta, validar con usuarios reales)

Roles: administrador, pastor, secretario, tesorero, coordinador.

| Módulo | Administrador | Pastor | Secretario | Tesorero | Coordinador |
|---|---|---|---|---|---|
| Usuarios (RF-01) | CRUD | - | - | - | - |
| Miembros (RF-02) | CRUD | Lectura | CRUD | - | Lectura de su ministerio |
| Asistencia (RF-03) | CRUD | Lectura | CRUD | - | Registrar |
| Eventos (RF-04) | CRUD | CRUD | CRUD | Lectura | Crear los de su ministerio |
| Ministerios (RF-05) | CRUD | CRUD | Lectura | - | Gestionar el suyo |
| Donaciones (RF-06) | CRUD | Solo resumen | - | CRUD | - |
| Comunicados (RF-07) | CRUD | CRUD | CRUD | - | Lectura |
| Dashboard (RF-08) | Todo | Todo | Sin ingresos | Ingresos | Sin ingresos |
| Reportes (RF-09) | Todos | Todos | Miembros y asistencia | Ingresos | Su ministerio |
| Configuración (RF-10) | CRUD | - | - | - | - |

## Reglas de implementación

- **Los permisos se validan siempre en el backend**, nunca solo ocultando elementos en el frontend.
- Doble capa: middleware `requireRole` en Express y RLS en Supabase (el backend consulta con el JWT del usuario).
- `service_role` solo en el servidor (alta de usuarios y endpoints internos de n8n); nunca en el client.
- La información financiera (RF-06 e ingresos del dashboard) solo se expone a roles autorizados.
- Las donaciones pueden ser anónimas: `member_id` nullable.
- Los miembros **no se eliminan**: se desactivan (`active = false`).
- Contraseñas con hash (bcrypt o el auth de Supabase); nunca guardar ni registrar contraseñas en texto plano.
- Secretos y llaves solo en variables de entorno (`.env`, fuera del repositorio).
- Interfaz y textos al usuario en español; código, tablas y variables en inglés.
- Diseño: moderno, intuitivo y fácil de usar; responsive y pensado para celular primero.

## Flujo de trabajo por requisito (RF)

1. Leer el RF correspondiente en `docs/requisitos.md`.
2. Proponer un plan breve (modo plan) antes de escribir código.
3. Crear migración SQL, endpoint, pantalla y pruebas.
4. Correr pruebas y lint.
5. Marcar el checklist del RF en `docs/requisitos.md`.
6. Una rama y un commit claro por RF (`feat/rf-02-miembros`).

## Orden sugerido

RF-01 → RF-02 → RF-10 → RF-04 / RF-05 → RF-03 → RF-06 → RF-07 → RF-08 / RF-09 → PWA → n8n.

Las políticas RLS del coordinador van en una migración posterior (`coordinator_policies`), no en las migraciones de cada RF.

## Qué NO hacer

- No agregar dependencias sin justificarlo.
- No tocar migraciones ya aplicadas: crear una nueva.
- No cambiar la matriz de permisos sin avisarme.
