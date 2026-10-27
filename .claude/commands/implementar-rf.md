---
description: Implementa uno o varios RF (ej. /implementar-rf RF-02 o RF-04 RF-05)
argument-hint: RF-02 [RF-03 ...]
---

Implementa estos casos de uso: **$ARGUMENTS**

## Antes de escribir código
1. Lee solo la sección de esos RF en `docs/requisitos.md` y la matriz de roles de `CLAUDE.md`.
2. Revisa de forma puntual el código existente que vas a tocar (no recorras todo el repo).
3. Muestra un plan de máximo 10 líneas: tablas, endpoints, pantallas y pruebas.
   Continúa sin esperar respuesta, salvo que haya una duda real de requisitos o permisos.

## Implementación
4. Crea la rama `feat/<rf-en-minúsculas>` (por ejemplo `feat/rf-02-miembros`).
5. Migración SQL nueva en `supabase/migrations/` (nunca edites una ya aplicada).
6. Endpoints en `server/`, con **validación de rol en el backend** según la matriz.
7. Pantallas en `client/`: interfaz en español, responsive y pensada primero para celular.
8. Pruebas:
   - API: casos felices y errores comunes.
   - Permisos: prueba que cada rol permitido pueda y que cada rol no permitido reciba 403.
   - Frontend: solo lo esencial del componente principal.

## Cierre
9. Corre las pruebas con reporte mínimo (solo fallos) y corrige lo que falle.
10. Marca en `docs/requisitos.md` las casillas completadas (solo las que realmente funcionan y están probadas).
11. Haz un commit claro por RF. No hagas push.
12. Responde con un resumen de máximo 8 líneas: qué se hizo, qué quedó pendiente y qué decisiones tomaste.
    Termina recordándome que ejecute `/usage` y anote tiempo y consumo en la tabla de medición de `docs/requisitos.md`.

## Reglas
- No agregues dependencias sin decir por qué.
- No cambies la matriz de permisos sin avisar.
- No imprimas logs completos: resume.
