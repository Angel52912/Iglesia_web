---
description: Corre lint y pruebas con salida mínima (solo fallos). Usa "e2e" para incluir Playwright
argument-hint: [e2e]
---

Ejecuta la verificación del proyecto gastando los menos tokens posibles.

1. En `server/` y en `client/` (solo si existen), corre lint y pruebas con reporte silencioso o mínimo
   (por ejemplo `npm --prefix server test --silent` y `npm --prefix client test --silent`).
2. Si el argumento es **e2e** (`$ARGUMENTS`), corre además Playwright
   (`npx playwright test --reporter=line`). Si no, sáltalo.
3. **No pegues los logs completos.** Responde con:
   - Una línea por suite: ✅ pasó o ❌ falló, con el número de pruebas.
   - Para cada fallo: archivo, nombre de la prueba y causa probable en una línea.
   - Máximo 20 líneas en total.
4. Si hay fallos, propón la corrección pero **no la apliques** hasta que yo lo confirme.
