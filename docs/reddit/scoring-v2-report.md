# ElevenFate Reddit: análisis y mejora del sistema de puntos

Fecha: 6 de octubre de 2026. Base examinada: commit `91b6449b6e9dc4226f0b36b35384bc3558a425dc`, rama `codex/reddit-adaptation`. Alcance: Daily; la carrera libre no tiene esta clasificación. Cambio preparado para revisión, sin publicación en Reddit.

## Diagnóstico

La fórmula anterior convierte seis atributos finales en hasta 1.000 puntos: forma y papel deportivo, 20% cada uno; físico, técnica, profesionalidad y control de carrera, 15% cada uno. No utiliza el historial del intento. Dos carreras con atributos finales iguales puntúan igual aunque sus partidos, títulos y evolución sean distintos.

La fórmula favorece subir atributos hasta su límite de 100. En la muestra anterior, repetir la segunda opción consiguió máximos finales en papel, físico, técnica y profesionalidad en los diez días. La puntuación termina dependiendo mucho de la forma final y del control. El resultado resume el estado del futbolista al retirarse, pero explica mal su legado.

Hay otros incentivos relevantes: el fichaje en un club de menor prestigio puede elevar el papel previsto y facilitar minutos; los premios de goleador y jugador de la temporada dependen de su liga. La práctica usaba la misma semilla que el Daily, permitiendo explorar su resultado antes del intento competitivo. Un resultado terminado también se calculaba de nuevo al consultar la clasificación, lo que complicaba cambiar la fórmula manteniendo los puntos históricos.

## Mejora implementada

Se conservan los 1.000 puntos y se distribuyen así:

| Componente | Máximo | Qué valora |
| --- | ---: | --- |
| Rendimiento | 350 | Notas reales y participación en liga y Champions |
| Trayectoria | 200 | Papel, técnica y profesionalidad durante las seis etapas |
| Logros | 150 | Títulos y distinciones registradas, con rendimiento decreciente |
| Control de carrera | 150 | Autonomía durante las seis etapas |
| Continuidad y salud | 100 | Participación, físico y riesgo acumulado por etapas |
| Cierre de carrera | 50 | Estado final con la fórmula anterior |

El cambio reduce del 100% al 5% el peso directo de la fotografía final. Los atributos también influyen en la trayectoria y en los partidos, de forma coherente con el simulador. La puntuación muestra cada componente y su máximo en el epílogo; el jugador puede entender por qué obtuvo ese resultado.

## Fórmulas y límites

Todas las magnitudes se limitan al intervalo de 0 a 1 antes de convertirlas en puntos. Cada componente se redondea por separado; el total es la suma y nunca supera 1.000. Se calcula exclusivamente con el intento confirmado por el servidor.

**Rendimiento:** para cada partido disputado se transforma su nota en `clamp((nota − 4) / 5)`. Se promedian esas notas y se multiplica por la raíz cuadrada de la proporción de partidos disputados sobre los partidos registrados del equipo. No disputar partidos da cero. Una nota excepcional en pocos encuentros no equivale a una carrera completa. Se usan los registros de liga y Champions, no el campo de jornadas de liga, que excluye partidos continentales. Los goles y asistencias contribuyen a las notas y distinciones del motor; no se añaden de nuevo como un bonus bruto que premie principalmente al delantero.

**Trayectoria:** se guarda una fotografía al cerrar cada una de las seis etapas. Cada fotografía combina 40% papel, 40% técnica y 20% profesionalidad. Las seis tienen el mismo peso, aunque duren distinto número de años. Las etapas ausentes cuentan como cero. Este criterio impide que el último tramo borre el resto de la carrera.

**Logros:** una liga aporta 1 crédito; Champions adaptada, 2; máximo goleador y jugador de la temporada, 0,5 cada uno. Los títulos requieren al menos diez apariciones registradas esa temporada; las distinciones, veinte. Se deduplican por temporada, club y nombre. Solo cuentan los tipos de logro reconocidos, sin premiar etiquetas nuevas automáticamente. La puntuación es `150 × sqrt(clamp(créditos / 20))`. Un crédito vale unos 34 puntos; cinco, 75; diez, 106; veinte alcanzan el máximo. Cada logro adicional suma menos que el anterior. El requisito de participación es por temporada y combina liga y Champions; no acredita por sí mismo un mínimo de minutos en cada competición.

**Control:** media del control de carrera en las seis fotografías. Mantiene un objetivo personal valioso junto al deportivo.

**Continuidad y salud:** 50% proporción de partidos disputados, 30% media del físico y 20% media del inverso del riesgo en las seis etapas. No se restan puntos por cada lesión aislada: se valora el conjunto. La participación influye también en rendimiento, deliberadamente, para limitar las muestras pequeñas. Existe por tanto correlación entre ambos componentes.

**Cierre:** 5% del resultado de la fórmula antigua. Permite que terminar bien importe sin dominar toda la carrera.

## Comparación reproducible

Se simularon seis políticas durante diez días: 60 carreras completas y 1.800 decisiones. Para aislar la fórmula se mantuvieron las semillas v3 de los días 1–10 de octubre y las mismas elecciones. Cada carrera nueva se puntuó con las dos fórmulas. Los pesos nuevos se aplicaron también a los días previos solo en el experimento; no se migraron intentos reales.

Las tres primeras políticas repiten la primera, segunda o tercera opción y eligen el primer club. Las políticas de atributos repiten los índices de historias `[1,1,1,0]` y eligen el club de menor o mayor prestigio disponible. La política de forzar utiliza `[1,1,2,1]` y el menor prestigio. Los índices empiezan en cero. Son políticas de prueba, no una búsqueda exhaustiva de la estrategia óptima.

| Política | Media anterior | Media nueva | Rango nuevo |
| --- | ---: | ---: | --- |
| Primera opción | 661.9 | 410.8 | 360–478 |
| Segunda opción | 859.1 | 620.7 | 579–680 |
| Tercera opción | 668.5 | 485.3 | 434–548 |
| Atributos + club modesto | 810.2 | 584.2 | 569–638 |
| Atributos + club prestigioso | 788.8 | 560.8 | 525–587 |
| Forzar + club modesto | 788.6 | 613.2 | 593–633 |

Las escalas tienen el mismo máximo, pero distinta exigencia: que baje la media no demuestra por sí solo una mejora. La mejora comprobada es que las etapas, el rendimiento y los logros modifican el resultado directamente y de forma explicable. Se ajustó el umbral de logros de 6 a 20 créditos al detectar que llegaba al máximo demasiado pronto. Con el umbral final, 0 de las 60 carreras alcanzaron el máximo de logros.

La política de atributos con club modesto superó a la de club prestigioso en 8 de los diez días. Sigue existiendo una ventaja de oportunidad, ligada al papel previsto, la participación y los premios de cada liga. Cambiar solo la puntuación no elimina ese incentivo. No se concede un bonus automático por prestigio: premiarlo sin calibración podría hacer obligatorio fichar por una élite.

## Compatibilidad y clasificación

La nueva versión de reglas es v4 y la versión de puntuación es 2. El formato de guardado se mantiene en versión 3 con campos adicionales. Los intentos sin versión de puntuación y los intentos v3 conservan exactamente la fórmula anterior. Los nuevos almacenan seis fotografías y el resultado final, que queda congelado al terminar. Consultar o reparar el ranking utiliza ese resultado almacenado.

Se fija una activación en el límite UTC del 7 de octubre de 2026, con el identificador `daily-v4:fecha`. Los días anteriores conservan `daily-v3:fecha`, su semilla y su ranking. **La fecha debe ser futura al publicar: si la revisión acaba después, hay que mover `SCORE_V2_START_DAY` al siguiente límite UTC antes del despliegue.** Publicar el cambio a mitad de un día posterior a la fecha prevista abriría otro espacio de intentos ese mismo día; debe evitarse. Esta rama no despliega nada por sí sola.

Desde v4, la práctica usa una semilla distinta y no consume el intento ni entra en clasificación. Sigue siendo reproducible para aprender las reglas. Los puntos enviados por el navegador se ignoran; los reintentos de comandos no duplican decisiones ni entradas.

## Verificación y próximos ajustes

Se comprobaron las nueve pruebas existentes del Daily y ocho nuevas de puntuación: límites, suma de pesos, participación, ausencia de bonus bruto por goles, influencia de etapas anteriores, deduplicación, mínimos para logros, recompensas decrecientes, compatibilidad, resultado congelado, cambio de día UTC, separación de práctica y restauración desde el servidor. Las pruebas existentes también verifican conflictos, idempotencia, aislamiento de carrera libre, tamaño de guardado y recuperación tras fallo del ranking. Se comprobó la sintaxis de los archivos modificados y del experimento.

No se ejecutó la compilación completa de Devvit ni una prueba visual en Reddit; estas comprobaciones siguen pendientes antes de publicar. La muestra de 60 carreras permite comparar incentivos concretos, pero no representa jugadores reales, todas las posiciones ni todas las combinaciones de decisiones. No prueba ausencia de exploits ni una estrategia óptima.

El siguiente ajuste de equilibrio debería centrarse en los minutos concedidos al fichar y en la comparabilidad de las distinciones entre ligas. Conviene ampliar el experimento a políticas mixtas, posiciones distintas y más semillas; después evaluar distribución, empates, satisfacción y comprensión del desglose con jugadores. Las decisiones de reserva se repiten y muchas favorecen sistemáticamente la misma opción: mejorar sus costes y compensaciones es una tarea de contenido separada, necesaria para que haya estrategias variadas.

## Archivos y reproducción

Implementación: `reddit/server/daily-score.mjs`, `daily-run.mjs` y `daily-service.mjs`. Presentación: `reddit/client/daily.mjs`. Pruebas nuevas: `reddit/test/daily-score.test.mjs`.

Ejecutar `node --test reddit/test/daily.test.mjs reddit/test/daily-score.test.mjs`. Ejecutar `node docs/reddit/scoring-v2-study.mjs` para repetir las 60 carreras y generar sus resultados junto al script. La comparación documentada usa el motor comprometido en el commit base y no depende de la fecha actual del ordenador.
