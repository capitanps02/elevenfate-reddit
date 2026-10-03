# Daily v1 · prototipo

3 de octubre de 2026. Primera iteración: 5 decisiones del catálogo original desde el inicio de carrera (18 años, Valdoria). La duración objetivo es 3–5 minutos, pendiente de medir con el usuario. Reglas y puntuación provisionales; sin premios ni ranking.

| Tarea | Prototipo | Pendiente para publicar |
|---|---:|---|
| D01 Fecha UTC, seed y reglas | 100% | Validar interés y duración; variedad de situaciones iniciales |
| D02 Intento separado y recuperación | 70% | Redis real, expiración de datos históricos, fallos de red y concurrencia |
| D03 Ejecución y puntuación de servidor | 70% | Latencia/coste real, calibrar fórmula y versionar cambios de catálogo |
| D04 Pantallas de entrada, elecciones y resultado | 60% | Pulido con diseño original, móvil y revisión de ofertas |
| D05 Prueba conjunta y cierre de regresión | 20% | Feedback del usuario, Android/iOS, actualización y ranking después |

Avance del Daily: **64% del prototipo**, promedio simple de las cinco tareas; no es porcentaje del lanzamiento base. Estimación restante hasta candidato Daily: **8–14 horas efectivas**, sujeta a latencia y feedback. El plan inicial de 15–24 h sigue siendo referencia para Daily con ranking.

## Reglas

- Seed derivada de `daily-v1:YYYY-MM-DD`, fecha del servidor UTC.
- Un intento por cuenta/comunidad/día; se puede volver y continuar. Nunca se permite importar una partida o reiniciar el resultado del día.
- El servidor conserva el snapshot y ejecuta únicamente elecciones, reconocimiento de consecuencias y respuestas a ofertas. El cliente no calcula ni envía puntuaciones.
- Avance temporal automático del motor original hasta el siguiente momento; no se modifica ningún evento ni consecuencia.
- Tras resolver cinco decisiones termina el intento. La última consecuencia sigue visible en el resultado.
- Puntuación sobre 1.000: forma 30%, papel deportivo 25%, estado físico 20%, profesionalidad 15% y control de carrera 10%. Variables acotadas a 0–100 y desglose visible. Esta fórmula debe calibrarse antes del ranking.
- Al cambiar de día se rechazan acciones del reto anterior; recuperar abre el de hoy.
- Toda actualización que cambie catálogo o puntuación exige incrementar la versión Daily y no mezclar resultados.

## Pruebas

`pnpm run verify:reddit`: 12 pruebas Reddit aprobadas, incluidas tres Daily. Dos usuarios con idénticas decisiones producen vistas y resultados idénticos; recarga mantiene el intento; carrera libre intacta; cambio UTC; rechazos de acciones de simulación/importación y usuario anónimo; puntuación enviada por cliente ignorada.

La vista previa usa memoria y no demuestra Redis real. No hay clasificación todavía. Antes de habilitarla: control de recursos/solicitudes y retención de intentos, comprobación de latencia en Reddit, puntuación interesante, publicación idempotente del resultado en sorted set y ranking diario con resultados de la misma versión.
