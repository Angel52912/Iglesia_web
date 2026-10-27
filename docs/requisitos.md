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
- [ ] Registrar usuarios del sistema.
- [ ] Iniciar y cerrar sesión.
- [ ] Autenticación mediante correo y contraseña.
- [ ] Recuperar o restablecer contraseñas.
- [ ] Manejar roles: administrador, pastor, secretario, tesorero y coordinador.
- [ ] Restringir el acceso a las funciones según el rol.

### RF-02. Gestión de miembros
- [ ] Registrar nuevos miembros de la iglesia.
- [ ] Consultar el listado de miembros.
- [ ] Editar información personal.
- [ ] Registrar nombre, teléfono, correo y fecha de ingreso.
- [ ] Buscar miembros por nombre.
- [ ] Filtrar miembros activos e inactivos.
- [ ] Desactivar registros sin eliminarlos permanentemente.

### RF-03. Control de asistencia
- [ ] Registrar asistencia a cultos, reuniones y actividades.
- [ ] Seleccionar la fecha y el evento correspondiente.
- [ ] Marcar miembros presentes y ausentes.
- [ ] Consultar el historial de asistencia.
- [ ] Generar reportes semanales y mensuales.

### RF-04. Gestión de eventos
- [ ] Crear eventos religiosos y administrativos.
- [ ] Registrar título, fecha, hora, lugar y descripción.
- [ ] Asignar responsables.
- [ ] Modificar o cancelar eventos.
- [ ] Visualizar eventos en un calendario.

### RF-05. Administración de ministerios
- [ ] Registrar ministerios o grupos de trabajo (ej.: música, jóvenes, niños, enseñanza, servicio).
- [ ] Asignar coordinadores.
- [ ] Vincular miembros a cada ministerio.
- [ ] Consultar integrantes y actividades programadas.

### RF-06. Gestión de donaciones y aportaciones
- [ ] Registrar aportaciones económicas.
- [ ] Capturar fecha, monto, concepto y método de recepción.
- [ ] Consultar ingresos por periodos.
- [ ] Generar resumen mensual.
- [ ] Restringir la información financiera a personal autorizado.
- [ ] Permitir registros anónimos sin asociarlos obligatoriamente a una persona.

### RF-07. Comunicados y anuncios
- [ ] Publicar anuncios para los miembros.
- [ ] Editar y eliminar publicaciones.
- [ ] Indicar fecha de publicación.
- [ ] Mostrar los próximos eventos y avisos importantes.

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
- [ ] Registrar nombre de la iglesia.
- [ ] Agregar logotipo.
- [ ] Dirección y datos de contacto.
- [ ] Registrar horarios habituales de reuniones.
- [ ] Actualizar información institucional.

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
