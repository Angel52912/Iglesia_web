# Requisitos del proyecto: Sistema de Gestión de Iglesia

## 1. Requisitos mínimos del curso (pizarrón)

- Aplicación **web**, una sola aplicación, equipo de 4 personas.
- Entrega: **3 de noviembre**, con todos los RQ más análisis.
- Encuestas (4) y entrevistas a usuarios reales.
- Diseño en Figma: **12 de noviembre**.

| Área | Requisito | Qué debe incluir |
|---|---|---|
| Problema real | Propuesta de valor | Resolver una necesidad; identificar usuarios reales |
| Diseño | UI/UX | Interfaz moderna, intuitiva y fácil de usar |
| Usuarios y roles | Autenticación y autorización | Login y permisos por rol |
| Base de datos | Persistencia | Datos guardados de forma persistente |
| Integración | APIs | Al menos una integración con una API externa |

Extras indicados: **automatización inteligente (n8n)** y **experiencia web avanzada (PWA)**.

## 2. Roles

Administrador, pastor, secretario, tesorero y coordinador.

## 3. Casos de uso

### RF-01. Inicio de sesión y usuarios
- [x] Registrar usuarios del sistema.
- [x] Iniciar y cerrar sesión.
- [x] Autenticación mediante correo y contraseña.
- [x] Recuperar o restablecer contraseñas.
- [x] Manejar roles: administrador, pastor, secretario, tesorero y coordinador.
- [x] Restringir el acceso a las funciones según el rol. (401/403 por rol probado; las políticas RLS no tienen pruebas automáticas contra la BD)

### RF-02. Gestión de miembros
- [x] Registrar nuevos miembros de la iglesia.
- [x] Consultar el listado de miembros.
- [x] Editar información personal.
- [x] Registrar nombre, teléfono, correo y fecha de ingreso.
- [x] Buscar miembros por nombre.
- [x] Filtrar miembros activos e inactivos.
- [x] Desactivar registros sin eliminarlos permanentemente.
(Verificado manualmente contra Supabase real: migración aplicada, RLS y permisos por rol probados.)

### RF-03. Control de asistencia
- [x] Registrar asistencia a cultos, reuniones y actividades.
- [x] Seleccionar la fecha y el evento correspondiente.
- [x] Marcar miembros presentes y ausentes.
- [x] Consultar el historial de asistencia.
- [x] Generar reportes semanales y mensuales.
(Verificado contra Supabase real con `npm run db:verify-attendance`: admin y secretario guardan y corrigen; pastor lee sin escribir; tesorero y coordinador no leen; 409 en evento cancelado; reportes semanal y mensual con eventos en el último día del mes. El registro por el coordinador llega con `coordinator_policies`.)

### RF-04. Gestión de eventos
- [x] Crear eventos religiosos y administrativos.
- [x] Registrar título, fecha, hora, lugar y descripción.
- [x] Asignar responsables.
- [x] Modificar o cancelar eventos.
- [x] Visualizar eventos en un calendario.
  (Verificado contra Supabase real; ver nota de RF-05. Los eventos no se eliminan: se cancelan.)

### RF-05. Administración de ministerios
- [x] Registrar ministerios o grupos de trabajo (ej.: música, jóvenes, niños, enseñanza, servicio).
- [x] Asignar coordinadores.
- [x] Vincular miembros a cada ministerio.
- [x] Consultar integrantes y actividades programadas.
  (Verificado contra Supabase real con los repositorios reales: migraciones aplicadas, 409 por nombre repetido, 400 por miembro/ministerio inexistente, RLS por rol. La API se prueba también con repositorios simulados. Coordinador sin acceso hasta la migración `coordinator_policies`; el tesorero ve los eventos sin responsables ni ministerio porque RLS le oculta miembros y ministerios.)

### RF-06. Gestión de donaciones y aportaciones
- [x] Registrar aportaciones económicas.
- [x] Capturar fecha, monto, concepto y método de recepción.
- [x] Consultar ingresos por periodos.
- [x] Generar resumen mensual.
- [x] Restringir la información financiera a personal autorizado.
- [x] Permitir registros anónimos sin asociarlos obligatoriamente a una persona.
  (API probada con repositorios simulados: roles 401/403, validaciones, total en centavos y resumen por mes. Pastor solo recibe el resumen agregado por método (`donation_summary`, `concept` NULL). Verificado contra Supabase real con los repositorios reales (42 comprobaciones, 2026-11-02): CRUD de admin y tesorero, donación anónima, montos 0 y negativos rechazados por la BD, pastor sin filas y con resumen sin `concept`, secretario y coordinador sin acceso a tabla, resumen ni `donation_donors`. El tesorero no lee `members`: elige donante con `donation_donors()`, que solo expone id y nombre a admin y tesorero.)

### RF-07. Comunicados y anuncios
- [x] Publicar anuncios para los miembros.
- [x] Editar y eliminar publicaciones.
- [x] Indicar fecha de publicación.
- [x] Mostrar los próximos eventos y avisos importantes.
(Migración `20261101000900_rf07_announcements.sql` creada, aún sin aplicar con `npm run db:push` ni verificada contra Supabase real; el tesorero no tiene acceso, según la matriz. Los próximos eventos solo se muestran a admin, pastor y secretario; el coordinador los verá cuando existan sus políticas.)

### RF-08. Panel principal (Dashboard)
- [ ] Total de miembros activos.
- [ ] Eventos próximos.
- [ ] Número de asistencias registradas.
- [ ] Cantidad de ministerios.
- [ ] Resumen de ingresos registrados, únicamente para roles autorizados.
- [ ] Gráficas estadísticas.

### RF-09. Reportes
- [ ] Reporte general de miembros.
- [ ] Reporte de asistencia por evento.
- [ ] Reporte de participación por ministerio.
- [ ] Reporte de ingresos por periodo.
- [ ] Exportación de reportes a PDF o Excel.

### RF-10. Configuración de la iglesia
- [x] Registrar nombre de la iglesia.
- [x] Agregar logotipo.
- [x] Dirección y datos de contacto.
- [x] Registrar horarios habituales de reuniones.
- [x] Actualizar información institucional.
  (Verificado contra Supabase real: migración aplicada, subida al bucket, URL pública, RLS por rol y rechazo de tipos no permitidos. La API se prueba con repositorio simulado. Solo el administrador lee la configuración, según la matriz.)

## 4. Requisitos adicionales (propuestos para cumplir el pizarrón)

> Propuestas: confirmar con el equipo y con los usuarios reales.

### RF-11. PWA
- [ ] Manifest e íconos; app instalable en celular.
- [ ] Service worker con caché básica de la interfaz.
- [ ] Funciona bien en pantallas pequeñas (registro de asistencia desde el celular).

### RF-12. Integración con API externa
- [ ] Envío de correos (o WhatsApp) para recordatorios y recuperación de contraseña.
- [ ] Opcional: sincronizar eventos con Google Calendar.

### RF-13. Automatización con n8n
- [ ] Recordatorio automático de eventos a responsables y miembros.
- [ ] Resumen mensual de ingresos enviado al tesorero.
- [ ] Aviso al pastor o coordinador de miembros con varias inasistencias seguidas.

## 5. Análisis (entrega 3 de noviembre)

- [ ] Problema y propuesta de valor.
- [ ] Usuarios reales identificados.
- [ ] 4 encuestas aplicadas y resumidas.
- [ ] Entrevistas realizadas y resumidas.
- [ ] Conclusiones que justifiquen los RF y los roles.

## 6. Medición de Claude Code (para el reporte)

| RF | Tiempo | Consumo (`/usage`) | Correcciones necesarias | Notas |
|---|---|---|---|---|
| RF-01 | | | | |
| RF-02 | | | | |
