# Daily v1 · prototipo

3 de octubre de 2026. Primera iteración: 5 decisiones del catálogo original desde el inicio de carrera (18 años, Valdoria). La duración objetivo es 3–5 minutos, pendiente de medir con el usuario. Reglas y puntuación provisionales; sin premios. Ranking diario con publicación voluntaria y práctica separada.

| Tarea | Prototipo | Pendiente para publicar |
|---|---:|---|
| D01 Fecha UTC, seed y reglas | 100% | Validar interés y duración; variedad de situaciones iniciales |
| D02 Intento separado y recuperación | 90% | Fallos de red y concurrencia real |
| D03 Ejecución y puntuación de servidor | 85% | Calibrar fórmula y publicar un resultado competitivo en Redis real |
| D04 Pantallas de entrada, elecciones y resultado | 80% | Pulido con diseño original, accesibilidad y revisión de ofertas |
| D05 Prueba conjunta y cierre de regresión | 45% | Feedback del usuario, Android/iOS y concurrencia |

Avance del Daily: **80% del prototipo**, promedio simple de las cinco tareas; no es porcentaje del lanzamiento base. Estimación restante hasta candidato Daily: **5–9 horas efectivas**, sujeta a dispositivos y feedback. El plan inicial de 15–24 h sigue siendo referencia para la entrega total Daily con ranking.

## Reglas

- Seed derivada de `daily-v1:YYYY-MM-DD`, fecha del servidor UTC.
- Un intento por cuenta/comunidad/día; se puede volver y continuar. Nunca se permite importar una partida o reiniciar el resultado del día.
- El servidor conserva el snapshot y ejecuta únicamente elecciones, reconocimiento de consecuencias y respuestas a ofertas. El cliente no calcula ni envía puntuaciones.
- Avance temporal automático del motor original hasta el siguiente momento; no se modifica ningún evento ni consecuencia.
- Tras resolver cinco decisiones termina el intento. La última consecuencia sigue visible en el resultado.
- Puntuación sobre 1.000: forma 30%, papel deportivo 25%, estado físico 20%, profesionalidad 15% y control de carrera 10%. Variables acotadas a 0–100 y desglose visible. Esta fórmula debe calibrarse antes del ranking.
- Al cambiar de día se rechazan acciones del reto anterior; recuperar abre el de hoy.
- Toda actualización que cambie catálogo o puntuación exige incrementar la versión Daily y no mezclar resultados.
- La práctica tiene otro espacio de guardado y queda fuera de la clasificación. Publicar es voluntario; reintentar publicación sustituye la entrada propia con el mismo resultado confirmado.
- Ranking: diez primeras posiciones, posición propia y total. Empates ordenados por Redis de manera estable; no se muestran nombres ni identificadores de cuenta.
- Intentos escritos desde 0.0.3 caducan siete días después del cambio de día; ranking ocho días tras última publicación. No afecta la carrera libre.

## Pruebas

`pnpm run verify:reddit`: 13 pruebas Reddit aprobadas, incluidas cuatro Daily. Dos usuarios con idénticas decisiones producen vistas y resultados idénticos; recarga mantiene el intento; carrera libre intacta; cambio UTC; rechazos de acciones de simulación/importación y usuario anónimo; puntuación enviada por cliente ignorada. Práctica completa sin alterar Daily/ranking; publicar antes de terminar se rechaza; dos usuarios publican correctamente; reenvío no duplica y no devuelve identificadores públicos.

La vista previa usa memoria y no demuestra Redis real. Ranking diario implementado con sorted set y versión de reglas propia. Pendientes: publicar el primer resultado competitivo en Redis real, calibrar puntuación y probar concurrencia/errores en dispositivos.

Versión 0.0.2 subida e instalada en r/elevenfate_dev2. [Post privado de prueba](https://www.reddit.com/r/elevenfate_dev2/comments/1wwq9n4/elevenfate_tu_carrera_tus_decisiones_tu_legado/). Verificado en Reddit web: apertura, creación de intento Daily con Redis real, cierre y reapertura conservando «La lista de 26» en 0/5. Elecciones reservadas para la prueba del usuario. Pendientes finalización y puntuación en Redis real; la prueba automatizada sí llega al final con memoria.

Versión 0.0.3 instalada y probada en el mismo post: conserva Daily 0/5 de 0.0.2; práctica completa con primera opción en cada escena (La lista de 26, Dos órdenes, La cena de los mayores, Cinco minutos más, Un puesto que no es el tuyo), resultado real **463/1.000**. Ranking leído desde Redis con cero participantes; práctica no dispone de botón de publicación. Resultado legible en simulador móvil de Reddit. No es prueba de dispositivo físico. Corrección visual posterior: deltas redondeados a una cifra decimal y textos diferenciados de práctica.

Versión 0.0.4 subida e instalada con los ajustes visuales. Verificada recuperación de Daily 0/5 y práctica 5/5 con los mismos 463 puntos tras la actualización; texto final de práctica correcto. Motor y CSS originales siguen idénticos a la instantánea 4a82640. La publicación competitiva real sigue pendiente; no se ha consumido el intento del usuario para simularla.
