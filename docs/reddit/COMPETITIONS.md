> Actualización de interfaz: **0.1.4 instalada en pruebas y enviada a revisión (In Review)**. Guardado discreto, último resultado compacto y detalle de partidos antiguos corregido. Avance total hacia publicación: **93%**. Estado actual y tareas pendientes: [PUBLICATION-PROGRESS.md](PUBLICATION-PROGRESS.md). El resto del documento recoge la entrega del simulador 0.1.0.

# Competiciones de la edición Reddit

4 de octubre de 2026. Desarrollado exclusivamente en la copia independiente.

| Tarea | Avance | Criterio / pendiente |
|---|---:|---|
| C01 Calendario y resultados de liga | 100% | Ida/vuelta, un rival por jornada, local/visitante, puntos y diferencia de goles reconciliados |
| C02 Conectar carrera larga | 100% | Registro oficial, avance que se detiene en cada partido, decisiones y contratos; beta 0.0.9 instalada; partida existente recuperada |
| C03 Competición continental | 100% | 32 clubes europeos, grupos y eliminatorias, agregado y penaltis; vista de equipo clasificado verificada localmente en nueve tamaños |
| C04 Daily acelerado | 100% | 30 decisiones, 20 temporadas, estadísticas de liga y Champions; namespace v3 conserva intentos anteriores |
| C05 Inicio y pantallas de detalle | 100% | Inicio: puesto/puntos, último resultado y siguiente rival; resultados/tabla/Champions en detalle; matriz de detalle en nueve tamaños completada |
| C06 Regresión y persistencia | 100% | Pruebas de calendario, balances, determinismo, contratos, dos temporadas y guardado; 29 pruebas Reddit y 221 regresiones aprobadas |
| C07 Actualizar beta privada | 100% | 0.0.9 instalada y práctica completa real verificada |
| C08 Enviar a revisión | 100% | Versión 0.1.0 enviada; estado In Review confirmado en Developers |

## Reglas

La liga usa clubes ficticios del catálogo, fuerza de equipo, ventaja de local, forma y variación determinista de goles. Cada pareja se enfrenta una vez en cada campo. La tabla suma exclusivamente sus marcadores: victoria 3, empate 1. Daily incorpora las condiciones del jugador en sus partidos y evolución de fuerzas entre temporadas; la carrera larga conserva el productor de participación y rendimiento del motor y lo conecta a los nuevos rivales y resultados. Son reglas de juego, no una predicción de fútbol real.

El título de liga requiere finalizar primero y haber participado. El máximo goleador compara goles con los goleadores simulados; el premio de temporada compara notas con participación mínima. Se elimina la antigua regla de títulos por media de puntos.

Champions usa un **formato adaptado**, con ocho grupos de cuatro y seis partidos por equipo, seguido de octavos, cuartos y semifinales a doble partido y una final. Los empates agregados se resuelven con penaltis; no hay regla del gol visitante. La clasificación inicial procede de ligas anteriores simuladas. En Daily, si se dispone de la liga real simulada del año previo, se reutiliza para clasificar sus clubes. Los clubes de ligas no europeas no participan. No se afirma que sea el formato UEFA actual.

Daily simula sin animación cada encuentro, conserva estadísticas individuales de liga y competición continental y muestra el resumen por etapa. El detalle permite seleccionar temporada y consultar resultados de tu equipo y tabla. Los datos del próximo reto y los marcadores continentales futuros no se envían en la vista pública Daily.

La carrera larga se detiene al registrar cada partido o al surgir una decisión. Mantiene en el inicio un resumen compacto; las pestañas de detalle muestran todas las jornadas disputadas y la clasificación a esa fecha, además de Champions. La posición no adelanta jornadas futuras.

## Compatibilidad

`redditCompetitionFrom` activa las reglas solo en esta edición. Las carreras existentes sin partidos oficiales se activan al cargar. Las que ya contengan resultados del calendario anterior mantienen esos hechos y activan el nuevo calendario el siguiente 1 de julio. No se reescriben partidos anteriores. El comportamiento predeterminado del motor sigue cubierto por las regresiones originales.

La integración modifica cuatro archivos de `src/` **en la copia**; el resto se reutiliza. `source-integrity.json` comprueba que ninguno de los 2.130 archivos del original cambió.

## Rendimiento local

Una carrera de 20 temporadas y 30 decisiones: **1.199 ms** de cómputo acumulado; acción más lenta **74 ms**; guardado **1.088.772 bytes**, inferior al límite de 1.500.000. Semilla 207, primeras opciones. Incluye preparación de vistas; excluye latencia de Reddit/Redis y no garantiza el mismo tiempo en producción. Evidencia: `competition-benchmark.json`.

## Validación

Calendario de ida/vuelta y cobertura de parejas; reconciliación de GF/GC y puntos; variación entre semillas; campeón exclusivamente según tabla; grupos y ganadores agregados; ausencia de choques de fechas; registros oficiales de Champions; parada en un solo partido; dos temporadas y contratos reales con guardado/carga idénticos. Las pruebas Daily comparan apariciones/goles/asistencias con todos sus registros de liga y Champions, para 15 trayectorias de semilla/estrategia.

Pendiente completar la matriz visual nueva, comprobación en Reddit real de la nueva versión y nueva validación en iPhone/Android físicos. No se considera terminada la publicación.

Beta 0.0.9 subida e instalada en la comunidad privada. Práctica real completa: 30/30, 645 puntos, 265 partidos, 114 goles, 50 asistencias, 125 titularidades; ningún título en esta trayectoria. Temporadas histórica/final consultadas en Reddit: puesto 13.º y 17.º respectivamente. Daily competitivo confirmado sin empezar (0/30). La carrera larga existente se recuperó en 1 de noviembre de 2026; se conserva su calendario anterior hasta la siguiente temporada.

Prueba visual con club clasificado: sesión local válida, transferencia aceptada mediante el protocolo del motor y 16 partidos oficiales, cuatro de Champions. Grupo de Alicante Puente: 4 partidos, 8 puntos, DG +2; concuerda con 1–0, 2–1, 2–2 y 0–0. Captura: `champions-ui.jpg`. Tabla y cuadros de detalle revisados en nueve tamaños, sin desbordamiento horizontal y con controles de cierre visibles.

## Envío confirmado

Versión **0.1.0** enviada con el código fuente a la revisión de Reddit. Developers muestra **Private · In Review**, cero instalaciones para ese candidato; la beta privada instalada continúa en **0.0.9**. Todavía no está aprobada ni disponible públicamente. Código enviado: commit `dbd6a13`, subido al repositorio independiente. Captura: `review-0.1.0.jpg`.
