# Rediseño Reddit · 4 de octubre de 2026

Entrega privada 0.0.6. Todos los cambios están en el repositorio independiente `elevenfate-reddit`; el original permanece intacto. Se reutilizan retrato, imágenes, motor, contenido, consecuencias y contratos de interfaz Android.

| Tarea de esta iteración | Estado | Evidencia |
|---|---:|---|
| U01 Inicio compacto con jugador, tres indicadores, acción principal y Daily | 100% | Página y panel sin desbordamiento en tres tamaños; carga de carrera pendiente entra por Inicio |
| U02 Daily de una escena, progreso y acciones siempre accesibles | 100% | Cinco decisiones completas localmente; ayuda/práctica aparte; resultado con cinco indicadores |
| U03 Mantener opciones y Continuar visibles en carrera | 100% | Simular → decisión → consecuencia → Continuar local; decisión existente inspeccionada en Reddit |
| U04 Reducir trabajo entre decisiones | 100% | Se elimina segunda reconstrucción del motor al escribir una sesión ya validada; ranking se consulta al cargar/publicar, no con cada elección |
| U05 Regresión, tamaños e instalación privada | 100% | 41 pruebas aprobadas; versión instalada y recuperación comprobada con Redis real |

Los porcentajes describen esta entrega de diseño, no la aprobación pública ni la certificación de dispositivos.

## Comprobaciones

- `pnpm run verify:reddit`: compilación de motor/cliente/servidor y configuración CLI válidas; 13 pruebas aprobadas, sin fallos. Incluye determinismo, guardado, aislamiento, conflictos, reintentos, recuperación, Daily/práctica y ranking.
- `node --test scripts/test-player-actions-ui-contract.mjs scripts/test-t55-a19-ui.mjs`: 28 aprobadas, sin fallos, sobre la interfaz reutilizada.
- Inicio local: 320 × 480, 375 × 600 y 900 × 650. Altura de página igual al viewport; altura de Inicio igual a su scrollHeight. Acción principal y Daily dentro del cuadro en los tres casos.
- Carrera local: Simular conserva motor original; tres elecciones accesibles; consecuencia y Continuar funcionan. En 320 × 480, Continuar termina en y=457, dentro de los 480 px. Recarga muestra resumen de jugador y acceso a la decisión guardada.
- Práctica local: cinco elecciones del catálogo, con cuatro pasos de consecuencias, resultado 463/1.000; opciones dentro del cuadro, botón inferior nunca recortado. Resultado muestra las cinco variables a 320 × 480.
- En 320 × 480 la escena «La cena de los mayores», que tiene cuatro opciones largas, requiere leer parte del texto mediante desplazamiento dentro de su tarjeta. Se conserva todo el texto; la página y las opciones permanecen fijas. Ayuda e históricos también pueden desplazarse internamente.
- Reddit real 0.0.6, simuladores Mobile y Desktop: inicio, decisión pendiente de carrera, ayuda y práctica comprobados. Carrera conserva 6 jul 2026 / «Cinco minutos más»; práctica conserva 5/5 y 463 puntos de 0.0.4. Daily competitivo conserva 0/5 / «La lista de 26» sin consumir elecciones.
- Integridad nuevamente comprobada: 2.130 archivos del original sin cambios y 197 archivos `src/` de la copia idénticos. Evidencia: `source-integrity.json`.

No se ha cuantificado una mejora de latencia real: se ha reducido trabajo por petición, sin atribuir porcentajes de velocidad. Quedan para el lanzamiento las pruebas físicas Android/iOS, ofertas/carrera avanzada, errores reales de red, calibración de puntuación y publicación competitiva con Redis real. Ranking probado automáticamente con memoria; no se ha enviado aún a revisión pública.

[Post privado de prueba](https://www.reddit.com/r/elevenfate_dev2/comments/1wwq9n4/elevenfate_tu_carrera_tus_decisiones_tu_legado/)
