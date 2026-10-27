# Sistema de Gestión de Iglesia

Aplicación web (PWA) para administrar una iglesia: miembros, asistencia, eventos,
ministerios, donaciones, comunicados, dashboard y reportes.

- Equipo: 4 personas. Entrega del proyecto: **3 de noviembre de 2026**. Diseño en Figma: **12 de noviembre de 2026**.
- Requisitos completos y checklist: `docs/requisitos.md` (léelo antes de implementar cualquier RF).

## Stack (propuesto, ajustar si el equipo decide otro)

- Frontend: React + Vite, configurado como PWA (manifest + service worker)
- Backend: Node.js + Express
- Base de datos y auth: Supabase (PostgreSQL)
- Automatización: n8n (flujos exportados en `/n8n`)
- Reportes: PDF y Excel exportables desde el backend

## Estructura esperada

```
/client        # React + Vite (PWA)
/server        # API Express
/supabase      # migraciones SQL y seeds
/n8n           # flujos exportados (.json)
/docs          # requisitos, análisis, decisiones
```

## Comandos

> Completar cuando exista el scaffolding.

- Instalar: `npm install` (en `/client` y `/server`)
- Desarrollo: `npm run dev`
- Pruebas: `npm test`
- Lint: `npm run lint`

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

## Qué NO hacer

- No agregar dependencias sin justificarlo.
- No tocar migraciones ya aplicadas: crear una nueva.
- No cambiar la matriz de permisos sin avisarme.
