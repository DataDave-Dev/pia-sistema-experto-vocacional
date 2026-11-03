# PIA · Sistema Experto de Orientación Vocacional

- **Entregable:** `PIA_Sistema_Experto.docx` (portada FIME, índice, documento, código, guion del video y presentación).
- **Programa:** abrir `sistema-experto/index.html` en el navegador.
- **Pruebas:** `node sistema-experto/test.js`
- **Presentación para exponer:** `docs/Presentacion_PIA.pdf`

## Actualizar datos (catedrático, número de equipo, ligas)
1. Editar `EQUIPO` en `docs/datos.mjs`.
2. Si cambias la app: `node docs/capturas.mjs`
3. `node docs/presentacion.mjs && node docs/documento-word.mjs` (requiere `chromium`, `pdftoppm`, `zip`).

> Si `PIA_Sistema_Experto.docx` fue editado en Word, el script **no lo sobrescribe**: deja la versión nueva en `PIA_Sistema_Experto.generado.docx`.
