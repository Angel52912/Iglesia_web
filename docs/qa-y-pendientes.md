# Guía de QA y pendientes

## 1. Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| **Administrador** | `admin@iglesia.test` | Pedirla a quien creó los usuarios |
| Pastor | `pastor@iglesia.test` | Ídem |
| Secretario | `secretary@iglesia.test` | Ídem |
| Tesorero | `treasurer@iglesia.test` | Ídem |
| Coordinador | `coordinator@iglesia.test` | Ídem |

- Se crean con `npm run db:seed-users`. Cada contraseña sale de la variable `SEED_PASSWORD_<ROL>` en `server/.env`. No están en el repositorio.
- Si el dominio de los correos es otro, está en `SEED_EMAIL_DOMAIN` (por defecto `iglesia.test`).
- Un usuario creado a mano desde el panel de Supabase **no puede entrar**: debe crearse con el script o desde la pantalla de Usuarios (como administrador).

## 2. Cómo usar esta guía

1. Inicia sesión con el rol indicado y haz lo que dice la columna **Prueba**.
2. Compara con **Debe pasar**.
3. Marca `[x]` si coincide. Si falla, escribe al lado qué pasó y con qué rol.

"No debe poder" significa que la app oculta la opción **y** que la API responde error 403 si se llama directo.

## 3. Quién puede qué (resumen)

| Módulo | Admin | Pastor | Secretario | Tesorero | Coordinador |
|---|---|---|---|---|---|
| Usuarios | Todo | No | No | No | No |
| Miembros | Todo | Ver | Todo | No | Ver (su ministerio) |
| Asistencia | Todo | Ver | Todo | No | Registrar |
| Eventos | Todo | Todo | Todo | Ver | Crear (su ministerio) |
| Ministerios | Todo | Todo | Ver | No | Gestionar el suyo |
| Donaciones | Todo | Solo resumen | No | Todo | No |
| Comunicados | Todo | Todo | Todo | No | Ver |
| Dashboard | Todo | Todo | Sin ingresos | Solo ingresos | Sin ingresos |
| Reportes | Todos | Todos | Miembros y asistencia | Ingresos | Su ministerio |
| Configuración | Todo | No | No | No | No |

El coordinador está limitado hasta que se haga la migración `coordinator_policies` (ver sección 5): es normal que hoy no pueda hacer casi nada.

## 4. Checklist de QA

### 4.0 General (todos los módulos)
- [ ] **Sin iniciar sesión**, abrir cualquier pantalla → te manda al login.
- [ ] En celular (360 px de ancho) no aparece scroll horizontal y los botones se pueden tocar.
- [ ] Todos los textos y errores están en español y se entienden.
- [ ] Las listas muestran "Cargando…", "No hay datos" o el error, según el caso.
- [ ] Un usuario desactivado no puede entrar.

### 4.1 Inicio de sesión y usuarios
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Entrar con `admin@iglesia.test` y su contraseña | Entras al inicio |
| [ ] | Entrar con contraseña incorrecta | Mensaje genérico (no dice si el correo existe) |
| [ ] | Cerrar sesión | Vuelves al login |
| [ ] | "Olvidé mi contraseña" con un correo real | Llega un correo con enlace; la nueva contraseña funciona |
| [ ] | Admin crea un usuario de cada rol | Se crea y puede entrar |
| [ ] | Admin crea usuario con un correo ya usado | Error "ya existe un usuario con ese correo" |
| [ ] | Admin desactiva a otro usuario | Ese usuario ya no puede entrar |
| [ ] | Admin intenta desactivar o quitar el rol al único administrador | No lo permite |
| [ ] | Pastor abre la pantalla de Usuarios | No debe poder (403) |

### 4.2 Miembros
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Secretario crea miembro (nombre, teléfono, correo, fecha de ingreso) | Aparece en la lista |
| [ ] | Crear miembro sin nombre | Error de validación |
| [ ] | Editar un miembro | Se guardan los cambios |
| [ ] | Buscar por nombre; filtrar activos/inactivos | Resultados correctos |
| [ ] | Desactivar y reactivar | Cambia el estado; no existe "eliminar" |
| [ ] | Pastor entra a Miembros | Solo ve, sin botones de editar |
| [ ] | Tesorero entra a Miembros | No debe poder (403) |

### 4.3 Configuración de la iglesia
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Admin cambia nombre, dirección, teléfono y correo | Se guardan |
| [ ] | Admin sube un logotipo (png o jpg) | Se ve en pantalla |
| [ ] | Subir un archivo que no es imagen | Lo rechaza |
| [ ] | Agregar, editar y borrar un horario de reunión | Se refleja en la lista |
| [ ] | Cualquier otro rol entra a Configuración | No debe poder (403) |

### 4.4 Eventos
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Secretario crea un evento religioso y uno administrativo (título, fecha, hora, lugar, descripción, responsables) | Aparecen en el calendario, en su día |
| [ ] | Editar un evento | Se guardan los cambios |
| [ ] | Cancelar y reactivar un evento | Cambia el estado; no existe "eliminar" |
| [ ] | Cambiar de mes en el calendario | Muestra los eventos de ese mes |
| [ ] | Tesorero abre Eventos | Solo ve; sin botones; sin responsables ni ministerio |
| [ ] | Coordinador abre Eventos | No debe poder (403) hoy |

### 4.5 Ministerios
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Pastor crea un ministerio | Aparece en la lista |
| [ ] | Crear otro con el mismo nombre | Error "ya existe" |
| [ ] | Asignar coordinadores y vincular miembros | Se ven los integrantes y sus eventos |
| [ ] | Desactivar un ministerio | Queda inactivo |
| [ ] | Secretario entra a Ministerios | Solo ve |
| [ ] | Tesorero entra a Ministerios | No debe poder (403) |

### 4.6 Asistencia
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Secretario elige un evento, marca presentes y ausentes, guarda | Queda registrado |
| [ ] | Volver a abrir y corregir una marca | Se actualiza |
| [ ] | Registrar asistencia de un evento **cancelado** | Error, no se guarda |
| [ ] | Ver historial por evento y por fechas; reporte semanal y mensual | Los números coinciden con lo registrado |
| [ ] | Hacer todo lo anterior desde el celular | Es cómodo, aun con lista larga |
| [ ] | Pastor entra a Asistencia | Solo ve |
| [ ] | Tesorero entra a Asistencia | No debe poder (403) |

### 4.7 Donaciones (dinero: revisar con cuidado)
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Tesorero registra aportación (fecha, monto, concepto, método) | Aparece en la lista |
| [ ] | Registrar con monto 0 o negativo | Lo rechaza |
| [ ] | Registrar una donación **anónima** (sin miembro) | Se guarda sin donante |
| [ ] | Consultar por periodo y ver el resumen mensual | Los totales coinciden con lo capturado |
| [ ] | Pastor abre Donaciones | Solo ve el resumen por método; **sin concepto ni donante** |
| [ ] | Secretario y coordinador abren Donaciones | No deben poder (403) |

### 4.8 Comunicados
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Secretario publica un comunicado (con fecha) | Aparece en la lista |
| [ ] | Marcarlo como importante | Se destaca |
| [ ] | Editar y eliminar | Funciona |
| [ ] | Título o cuerpo vacío | Lo rechaza |
| [ ] | Coordinador abre Comunicados | Solo lee |
| [ ] | Tesorero abre Comunicados | No debe poder (403) |

### 4.9 Dashboard
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Admin abre el dashboard | Ve miembros activos, eventos próximos, asistencias, ministerios, ingresos y gráficas; las cifras coinciden con los datos |
| [ ] | Secretario y coordinador | Ven todo **menos ingresos** |
| [ ] | Tesorero | Ve **solo ingresos** |

### 4.10 Reportes
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Admin genera: miembros, asistencia por evento, participación por ministerio, ingresos por periodo | Datos correctos |
| [ ] | Exportar cada reporte a **PDF** y a **Excel** | Los archivos abren y los totales coinciden |
| [ ] | Secretario | Solo miembros y asistencia |
| [ ] | Tesorero | Solo ingresos |
| [ ] | Reporte de ingresos | Nunca muestra donantes ni conceptos |

### 4.11 PWA (app instalable)
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Instalar en Android (Chrome → Instalar app) | Ícono y nombre correctos |
| [ ] | Instalar en iPhone (Safari → Compartir → Añadir a inicio) | Ídem |
| [ ] | Abrir la app instalada | Pantalla completa |
| [ ] | Abrir sin internet | Carga la interfaz y avisa que no hay conexión para los datos |

### 4.12 Recordatorios por correo
| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | Admin abre un evento con responsables (que tengan correo) y pulsa **Enviar recordatorio** | Mensaje "Recordatorios enviados: N"; el correo llega (revisar spam) |
| [ ] | Responsable sin correo | Se cuenta como "sin correo" |
| [ ] | Evento cancelado | No muestra el botón / error 409 |
| [ ] | Servidor sin `RESEND_API_KEY` | Error "El envío de correos no está configurado" |
| [ ] | Tesorero o coordinador | No ven el botón; la API da 403 |

## 5. Lo que falta (para repartir)

Asigna un responsable a cada fila.

| # | Qué falta | Qué hay que hacer | Responsable | Listo |
|---|---|---|---|---|
| 1 | **Análisis (vence el 3 de nov)** | Problema y propuesta de valor, usuarios reales, 4 encuestas, entrevistas y conclusiones (ver `docs/requisitos.md` §5). No lleva código | | [ ] |
| 2 | **Figma (12 de nov)** | Diseño de las pantallas principales, pensado primero para celular | | [ ] |
| 3 | **Cerrar correos (RF-12)** | Crear cuenta en Resend, poner `RESEND_API_KEY` y `EMAIL_FROM` en `server/.env` y `.env.example`, probar un envío real. Configurar SMTP propio en Supabase (Auth → SMTP) para el correo de recuperar contraseña | | [ ] |
| 4 | **Automatización con n8n (RF-13)** | Flujos exportados en `/n8n`: recordatorio automático de eventos, resumen mensual de ingresos al tesorero, aviso por inasistencias seguidas | | [ ] |
| 5 | **Permisos del coordinador** | Migración `coordinator_policies`: que vea y gestione solo su ministerio, cree sus eventos, registre asistencia y vea su reporte | | [ ] |
| 6 | **Celular (RF-11)** | Revisar pantallas pequeñas (sobre todo asistencia) e instalar la app en un celular real | | [ ] |
| 7 | **Pruebas automáticas** | Pruebas de RLS contra la base de datos y E2E con Playwright de los flujos principales | | [ ] |
| 8 | **Validar roles** | Confirmar la tabla de permisos con usuarios reales | | [ ] |
| 9 | **Tabla de medición** | Llenar `docs/requisitos.md` §6 (tiempo, `/usage`, correcciones por RF; solo están RF-01 y RF-02) | | [ ] |
| 10 | **Publicar la app** | Hosting con HTTPS (la PWA lo exige), variables de producción y `CLIENT_ORIGIN` correcto | | [ ] |
| 11 | **Fusionar la rama** | Revisar `feat/rf-12-correos` (commit `0a059e9`) y pasarla a `main` | | [ ] |
| 12 | Opcional | Sincronizar eventos con Google Calendar | | [ ] |

## 6. QA de las validaciones y datos de la iglesia (nuevo)

| ☐ | Prueba | Debe pasar |
|---|---|---|
| [ ] | En Miembros y Configuración, escribir letras o símbolos en Teléfono | No se escriben; solo números, máximo 10 |
| [ ] | Guardar un teléfono con menos de 10 números | Lo rechaza ("exactamente 10 números") |
| [ ] | En Miembros y Usuarios, escribir números o símbolos en Nombre completo | No se escriben; solo letras (con acentos) y espacios |
| [ ] | Crear un evento con fecha de ayer (también por API) | Lo rechaza; el campo de fecha no deja elegir días pasados |
| [ ] | Crear un evento hoy y uno futuro | Se crean |
| [ ] | Editar un evento viejo (cambiar título) | Se puede guardar |
| [ ] | Cualquier rol: encabezado e inicio | Muestran logotipo y nombre de la iglesia; en el inicio, dirección y correo de contacto |
| [ ] | Admin cambia nombre o logotipo en Configuración | El encabezado se actualiza sin recargar |
| [ ] | Teléfono y horarios de la iglesia | Solo los ve el administrador, en Configuración |
