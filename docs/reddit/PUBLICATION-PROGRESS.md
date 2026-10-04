# Publicación · 4 de octubre de 2026

**Avance de alcance: 93%**, por hitos ponderados completados. No es una estimación del tiempo restante ni del progreso interno de la revisión de Reddit.

| Tarea concreta | Peso | Completado | Aporte |
|---|---:|---:|---:|
| Copia independiente y trazabilidad del original | 10% | 100% | 10 |
| Carrera larga, liga y Champions adaptada | 25% | 100% | 25 |
| Daily de 30 decisiones y simulación acelerada | 20% | 100% | 20 |
| Interfaz compacta, pantallas de detalle y guardado discreto | 15% | 100% | 15 |
| Guardado Redis, recuperación y control de conflictos | 10% | 100% del alcance implementado/automatizado | 10 |
| Verificación automatizada y visual (8); cierre físico final (2) | 10% | 80% | 8 |
| Preparación y envío a revisión | 5% | 100%: 0.1.4 In Review | 5 |
| Aprobación, instalación oficial, post y prueba pública | 5% | 0% | 0 |

Versión **0.1.4 enviada a revisión**, estado **Private · In Review** confirmado en Reddit Developers. Instalada también en r/elevenfate_dev2 y abierta en el post real: la carrera abre en 10 mar 2027 tras consultar el ranking. La entrega anterior verificó el cuadro compacto y 28 resultados registrados con ambos equipos. La aprobación y publicación siguen pendientes. Captura: `review-0.1.4.jpg`.

## Guardado discreto

La carrera muestra un texto de 10 px con un punto lateral bajo la fecha, dentro de una línea reservada en la cabecera. El aviso flotante desaparece únicamente en la adaptación Reddit. Daily utiliza un indicador lateral de 10 px en su fila existente; no mueve las opciones. Las lecturas dicen «Cargando…» y las escrituras «Guardando…». No se cambia la confirmación de guardado ni el bloqueo contra decisiones duplicadas. Los fallos siguen mostrando el mensaje y la acción de recuperación.

Verificación de esta iteración: build y configuración Devvit válidos, **32 pruebas aprobadas**, captura de carrera y Daily durante una escritura, matriz visual Daily de nueve tamaños sin desbordamiento horizontal ni botones fuera del área disponible. La captura local usa una latencia artificial de 5 s para inspeccionar el indicador; esa demora solo existe en el servidor local opcional, no en la aplicación subida. Las 221 regresiones del motor de la iteración anterior siguen como evidencia previa; no se han repetido para este cambio visual.

También se corrige la ruta de carreras antiguas: el inicio muestra solo el último resultado y el próximo partido; el detalle conserva todos los resultados. Un test con dos partidos confirma que no se pierde el historial. El detalle de partidas antiguas ya no anuncia que no hay jornadas si hay resultados, y coloca ambos equipos en orden local/visitante para interpretar bien el marcador. En Reddit 0.1.1 se verificó que la carrera guardada abre y que la práctica previa conserva 645 puntos y 30/30 decisiones.

Evidencias: `saving-career-mobile.jpg`, `saving-daily-mobile.jpg`, `saving-responsive.json`, `saving-tests.txt`, `beta-0.1.3-results.jpg`. El original vuelve a verificarse: 2.130 archivos, ningún cambio.

## Pendiente hasta publicación

1. Completar verificación física final: iPhone 13 en app Reddit con esta versión, cerrar/reabrir y confirmar progreso; Android real y navegación con una cuenta no moderadora. El buen funcionamiento previo en iPhone no sustituye esta comprobación final.
2. Recibir aprobación de Reddit y resolver cualquier observación. El estado de revisión no tiene un porcentaje medible ni una fecha garantizada.
3. Instalar la versión aprobada en r/ElevenFate y crear el post oficial jugable.
4. Verificar desde la entrada pública: carrera, Daily, persistencia, resultados y clasificación; comprobar que un usuario normal puede jugar sin permisos de moderador.

La publicidad permanece pendiente del lanzamiento público.

## Última ampliación · 0.1.4

Guardado discreto unificado con Daily. Clasificación accesible antes de jugar, registro automático de Daily completados, Top 25, posición y puntos propios fuera del Top y actualización manual. Validada en nueve tamaños y con 32 pruebas. En Reddit real: 785 puntos registrados automáticamente al recuperar el intento ya completado, posición 1 de 1 sin duplicados tras actualizar. Alcance de la ampliación 100%; avance de lanzamiento sigue 93% porque la aprobación y las pruebas físicas no han terminado. Detalle: [DAILY-RANKING.md](DAILY-RANKING.md).
