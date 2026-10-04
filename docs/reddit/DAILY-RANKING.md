# Clasificación diaria y guardado unificado · 4 de octubre de 2026

## Entrega

- Guardado de carrera larga con el mismo aviso pequeño, gris y lateral de Daily; dentro de una fila reservada bajo la fecha, sin tapar decisiones. Mantiene confirmación de Redis y protección contra escrituras antiguas. Las capturas de guardado usan 5 segundos artificiales únicamente en el servidor local.
- Botón **Top** desde cualquier pantalla del Daily, incluso antes de empezar. Consultar la tabla no consume el intento ni añade jugadores sin completar.
- Registro automático tras guardar la decisión final confirmada. La puntuación procede del servidor; el cliente no puede elegir su puntuación, repetir un Daily o incluir una práctica. Se conserva la acción antigua de publicación para clientes anteriores.
- Top 25, número de carreras completadas, posición y puntos propios incluso fuera del Top 25. Otras entradas muestran «Jugador», sin nombres públicos. Empates con orden ordinal determinista de Redis; el lugar mostrado coincide entre tabla y posición propia.
- Un día UTC por clasificación. Cambio a las 00:00 UTC; ocho días de caducidad desde el último registro. Tabla compartida por la instalación de esta comunidad; al lanzar en r/ElevenFate, sus jugadores competirán entre sí. No es una tabla global entre instalaciones de subreddits diferentes.
- Si Redis falla al registrar la puntuación después de confirmar la carrera, el intento terminado se conserva. Al recuperar el intento, se reintenta la entrada sin duplicados. Actualizar clasificación recarga los resultados desde el servidor.

## Verificación

**32 pruebas aprobadas**, build y configuración Devvit válidos. Casos nuevos: registro automático de dos carreras, puntuaciones del cliente ignoradas, duplicados, práctica excluida, posición fuera de Top 25, empates, reinicio UTC, fallo del ranking después de confirmar el guardado y recuperación idempotente. Las 221 regresiones anteriores del motor siguen como evidencia previa; esta entrega no modifica `src/`.

Prueba visual local con tres carreras completadas por usuarios ficticios: **851, 664 y 645 puntos**. Son fixtures de QA, no jugadores reales ni tráfico de Reddit. Nueve tamaños desde 320×480 hasta escritorio y horizontal 568×320: sin desbordamiento horizontal, botones de retorno/actualización dentro de pantalla. Evidencias: `daily-ranking-local.jpg`, `daily-ranking-responsive.json`, `daily-ranking-tests.txt`, `saving-unified-career.jpg`.

## Progreso de esta ampliación

| Tarea | Peso | Completado |
|---|---:|---:|
| Unificar aviso en carrera larga | 15% | 100% |
| Registro automático de resultados confirmados | 30% | 100% |
| Pantalla Top, posición propia y acceso desde inicio | 25% | 100% |
| Pruebas funcionales y visuales | 20% | 100% |
| Beta real y envío a revisión | 10% | 100% |

Ampliación: **100%** del alcance acordado. Avance hasta lanzamiento público: **93%** según PUBLICATION-PROGRESS.md; la aprobación y las comprobaciones físicas siguen pendientes.

## Comprobación real en Reddit

**0.1.4 instalada en r/elevenfate_dev2 y enviada a revisión: Private · In Review**. Al abrir el Daily ya terminado de la cuenta autenticada, se registra automáticamente **785 puntos**, posición **1 de 1**. Actualizar y volver al resultado conserva 30/30 decisiones y la misma puntuación, sin crear duplicados. No se ha jugado ni reiniciado el intento real para esta comprobación; se recuperó el que ya estaba guardado. Evidencias: `daily-ranking-reddit-0.1.4.jpg`, `daily-score-reddit-0.1.4.jpg`, `review-0.1.4.jpg`. Al volver desde el Daily, la carrera larga sigue disponible en 10 mar 2027. El original se verifica de nuevo: 2.130 archivos sin cambios.
