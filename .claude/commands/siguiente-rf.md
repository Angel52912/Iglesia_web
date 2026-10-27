---
description: Recomienda qué RF implementar ahora, si juntos o por separado, y en qué orden
---

Decide qué casos de uso (RF) conviene implementar a continuación. **No escribas código ni edites archivos**: solo recomienda.

Contexto mínimo (no leas más de esto):
- Los checklists de `docs/requisitos.md` y la matriz de roles de `CLAUDE.md`.
- `git log --oneline -n 10` para ver qué ya se hizo.

## Criterios

**Juntar** dos o más RF en una sola sesión cuando:
- comparten la misma entidad o tabla (por ejemplo, miembros y su estado activo/inactivo),
- comparten los mismos roles y permisos,
- y entre los dos suman pocas tareas (aprox. 8 casillas o menos del checklist).

**Separar** (una sesión por RF) cuando:
- el RF es grande o fundacional (RF-01 autenticación y roles),
- maneja dinero o datos sensibles (RF-06 donaciones): se revisa aparte,
- agrega una dependencia o integración externa (API, correo, n8n, PWA),
- depende de datos que otro RF todavía no tiene (reportes y dashboard van al final),
- o ya se corrigió varias veces en la misma sesión (contexto muy cargado).

Respeta el orden de dependencias: auth y roles → miembros → configuración → eventos y ministerios → asistencia → donaciones → comunicados → dashboard y reportes → PWA → n8n.

## Formato de respuesta (máximo 12 líneas)

1. **Siguiente sesión**: RF a implementar, y si van juntos o solos.
2. **Por qué** (una frase).
3. **Después**: los siguientes 2 pasos probables.
4. **Modelo sugerido**: ligero para implementar, potente solo si hay que diseñar arquitectura.
5. **Comando listo para copiar**: `/implementar-rf ...`

Si el trabajo pendiente no está claro, dilo en una línea en lugar de adivinar.
