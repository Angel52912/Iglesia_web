---
description: Resumen de media página (esencial y estructurado) de lo implementado en un RF
argument-hint: RF-01 [RF-02 ...]
---

Escribe un resumen **de media página (máximo 250 palabras)** de lo implementado en: **$ARGUMENTS**

Lector: estudiante de desarrollo. Lenguaje sencillo; explica un término técnico solo si es imprescindible.

Para ahorrar tokens:
- Usa `git diff main --stat` para ver qué cambió.
- Lee solo lo indispensable (migración SQL y rutas del RF); no recorras el repo.
- No copies código. No incluyas llaves, contraseñas ni valores de `.env`.

Guarda el resumen en `docs/informes/<rf-en-minúsculas>.md` (sobrescribe si ya existe) con exactamente este formato:

```
# RF-XX · <nombre>

**Resumen:** 2 líneas máximo.

**Archivos clave** (máx. 6)
- `ruta` — qué hace, en una frase.

**Flujo:** pantalla → endpoint → tabla → respuesta (una línea con flechas).

**Permisos**
| Acción | Admin | Pastor | Secretario | Tesorero | Coordinador |
(solo si el RF toca permisos; usa ✅ / ❌)

**Decisiones o desvíos del plan** (máx. 3)
- ...

**Pruebas:** X pasan / Y fallan. Qué no se probó.

**Probar a mano** (máx. 3 pasos)
1. ...

**Pendientes y riesgos** (máx. 3)
- ...
```

Al terminar, responde solo con la ruta del archivo y una línea de resumen.
