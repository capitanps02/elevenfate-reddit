import fs from 'node:fs';
const dir='docs/qa/calibracion-daily-2026-10-06',read=name=>JSON.parse(fs.readFileSync(`${dir}/${name}`,'utf8'));
const summary=read('summary.json'),results=read('results.json'),config=JSON.parse(fs.readFileSync('reddit/shared/daily-score-calibration.json','utf8')),validation=results.filter(r=>r.split==='validation');
const positions=[...new Set(validation.map(r=>r.position))],mean=a=>a.reduce((n,x)=>n+x,0)/a.length;
const oldMeans=Object.fromEntries(positions.map(p=>[p,mean(validation.filter(x=>x.position===p).map(x=>x.current))]));
let pairs=0,oldContradictions=0,newContradictions=0;
for(const seed of config.validationSeeds)for(const position of positions){const rows=validation.filter(x=>x.seed===seed&&x.position===position);for(let a=0;a<rows.length;a++)for(let b=a+1;b<rows.length;b++){const delta=rows[a].score.titleUnits-rows[b].score.titleUnits;if(Math.abs(delta)<1e-6)continue;pairs++;if(delta*(rows[a].current-rows[b].current)<0)oldContradictions++;if(delta*(rows[a].score.total-rows[b].score.total)<0)newContradictions++;}}
const diagnostics={oldMeans,newMeans:summary.validation.byPosition,oldPositionSpread:Math.max(...Object.values(oldMeans))-Math.min(...Object.values(oldMeans)),newPositionSpread:Math.max(...Object.values(summary.validation.byPosition))-Math.min(...Object.values(summary.validation.byPosition)),pairs,oldContradictions,newContradictions};fs.writeFileSync(`${dir}/diagnostics.json`,JSON.stringify(diagnostics,null,2));
const n=x=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(x),tests=fs.readFileSync(`${dir}/candidate-tests.log`,'utf8'),count=Number([...tests.matchAll(/ℹ tests (\d+)/g)].at(-1)?.[1]);if(!count||!tests.includes('ℹ fail 0'))throw Error('Candidate verification incomplete');
const labels={goalkeeper:'Portero',centre_back:'Central',full_back:'Lateral',defensive_midfielder:'Pivote',central_midfielder:'Mediocentro',winger:'Extremo',striker:'Delantero'};
const p=config.parameters;
const md=`# Daily: calibración del sistema de puntos

6 de octubre de 2026. **Candidata calibrada y evaluada localmente.** Objetivo: dar prioridad a títulos y logros deportivos. No se activa en los intentos del juego actual; v3–v7 conservan su cálculo.

## Resultado

Se han evaluado **560 carreras completas, equivalentes a 11.200 temporadas**: 350 de calibración y 210 de evaluación fuera de las semillas de ajuste. Se mantienen 500 puntos para logros, 200 para rendimiento, 150 para exigencia, 100 para participación y 50 para continuidad física.

Los 500 de logros se dividen en **350 de títulos, 125 de temporadas sobresalientes en la posición y 25 de hitos deportivos**. Se evita utilizar como puntos los premios ofensivos antiguos y se elimina el bonus directo de técnica, profesionalidad, control o físico al terminar.

En la evaluación reservada:

- Diferencia entre medias de posición: **${n(diagnostics.oldPositionSpread)} → ${n(diagnostics.newPositionSpread)} puntos**.
- De ${pairs} comparaciones dentro del mismo reto/posición con diferente crédito por títulos, el sistema anterior daba menos puntos totales a la carrera con más crédito en ${oldContradictions} (${n(oldContradictions/pairs*100)}%). La candidata lo hace en ${newContradictions} (${n(newContradictions/pairs*100)}%). No todo desacuerdo es un fallo: también puntúan calidad y logros individuales.
- Puntuaciones observadas: **${summary.validation.min}–${summary.validation.max}**, media ${n(summary.validation.mean)}. No se fuerza al ganador a obtener 1.000 ni se modifica el resultado cuando llegan otros participantes.
- Ganadores de los 21 contextos semilla/posición: ${Object.entries(summary.validation.winners).map(([policy,wins])=>`${policy}: ${wins}`).join('; ')}. Se cuentan todas las políticas empatadas, por lo que la suma puede superar 21. Son tres semillas con siete intervenciones de posición, no 21 mundos independientes.
- ${count} pruebas específicas de la candidata aprobadas. Las 76 regresiones previas de Reddit también pasaron en la corrida que incluía las primeras once pruebas del nuevo módulo.

## Qué se ha calibrado

**Referencia de rendimiento:** 42 celdas, una por cada posición y etapa. Cada una contiene media, dispersión y ajuste lineal por fuerza de división. Los datos se obtienen solo de las semillas de entrenamiento, de temporadas con al menos 900 minutos. La celda menor contiene ${Math.min(...Object.values(config.references).map(r=>r.count))} temporadas; la mayor, ${Math.max(...Object.values(config.references).map(r=>r.count))}. El primer ajuste se rechazó por falta de cobertura de 18–20 años; se ampliaron las semillas de entrenamiento sin cambiar las de evaluación.

Para cada temporada:

\x60\x60\x60text
nota = suma(nota de partido × minutos) / minutos
referencia = media(posición, etapa) + pendiente × (fuerza - fuerza media)
z = (nota - referencia) / dispersión
grado = limitar(0,5 + z/4, entre 0 y 1)
calidad = limitar(0,5 + (z/4) × minutos/(minutos + 450)) × min(1, minutos/900)
\x60\x60\x60

La dispersión tiene un suelo de 0,12 y la pendiente se limita a ±2. El grado usado para decidir logros se fija a seis decimales para que errores numéricos en el umbral no discriminen entre posiciones. Los puntos finales solo se redondean una vez.

Esta es una normalización estadística de las notas v7, **no una reescritura del simulador ni una unificación física de protagonista y NPC**. La candidata compara con referencias congeladas propias, evitando las notas de los rivales y sus premios de goleador. Una nueva versión del productor exige recalibrar esas referencias.

**Títulos:** proceden de la clasificación de liga y del ganador continental confirmado. Las etiquetas del resumen no conceden títulos. Su base es 35 unidades continentales; en liga, 20/6/2 para primera/segunda/tercera, multiplicadas por fuerza de división. El coeficiente de fuerza pertenece al diseño del juego, no a una clasificación federativa.

Se exige participación mínima: **${p.minimumLeagueMinutes} minutos de liga o ${p.minimumCupMinutes} continentales**. El crédito es min(1, minutos / (${n(p.titleParticipation*100)}% de los minutos disponibles)). No hay puntos de campeón por cero minutos ni por una aparición breve por debajo del mínimo. La repetición reduce valor, con multiplicador 1, 0,85, 0,70, 0,55 y suelo 0,50. Cambiar de club no reinicia el contador de la categoría.

\x60\x60\x60text
Puntos de títulos = 350 × min(1, ln(1 + unidades/8) / ln(1 + ${p.titleTarget}/8))
\x60\x60\x60

La referencia estadística inicial saturaba demasiado pronto. Se impone una referencia de al menos 100 unidades para que una o dos Champions con participación completa no llenen el bloque. Este mínimo se decidió por el objetivo de diseño y una prueba específica, no para maximizar un resultado del conjunto de evaluación.

**Temporadas sobresalientes:** una como máximo por temporada, con 20 partidos y 1.200 minutos. Grado ${n(p.outstandingGrade)} concede 5 unidades; grado ${n(p.exceptionalGrade)} concede 8, ajustadas por fuerza de división. Repetición con suelo 0,5. El bloque llega como máximo a 125 mediante curva logarítmica con referencia 20 y parámetro 4. Son logros de rendimiento relativo, no el premio oficial de mejor jugador de la liga. Todas las posiciones disponen del mismo presupuesto.

**Hitos:** cinco puntos por debut, cinco titularidades, una temporada con 20 partidos/1.500 minutos, participación continental y diez temporadas con al menos 450 minutos. Máximo 25 para la carrera entera; no se convierten las insignias v7 en una bolsa ilimitada de puntos.

**Participación:** minutos sobre el calendario real, con referencia del ${n(p.participationTarget*100)}% para el máximo de su bloque. **Exigencia:** fuerza de división multiplicada por exposición, completa al 50%. Usan media por temporada dentro de cada etapa, y seis etapas con igual peso.

**Continuidad:** proporción de encuentros en los que no aparece indisponibilidad por lesión, por temporada y etapa. Es un indicador de disponibilidad registrado, no una recomendación médica ni una medición del físico final. En esta simulación varía poco; su peso se mantiene pequeño. Los partidos continentales entran en notas, minutos y disponibilidad, además del crédito de sus títulos.

El desglose reparte los enteros por restos mayores: su suma coincide exactamente con el total mostrado, y ningún bloque supera su presupuesto.

## Evaluación por posición

| Posición | Media anterior | Media calibrada |
|---|---:|---:|
${positions.map(pos=>`| ${labels[pos]} | ${n(oldMeans[pos])} | ${n(summary.validation.byPosition[pos])} |`).join('\n')}

Se cambia la posición inicial en la investigación manteniendo semilla y política. La posición afecta las estadísticas y parte del desarrollo de la carrera, por lo que no se exige igualdad artificial de todos los resultados. La igualdad de puntos para el mismo rendimiento relativo, título y exposición sí se prueba de forma directa con notas brutas distintas y referencias distintas.

## Estrategias y límites de la muestra

| Política | Media calibrada en evaluación |
|---|---:|
${Object.entries(summary.validation.byPolicy).map(([policy,value])=>`| ${policy} | ${n(value)} |`).join('\n')}

Semillas de ajuste: ${config.trainSeeds.join(', ')}. Semillas de evaluación: ${config.validationSeeds.join(', ')}. Las diez políticas incluyen las ocho anteriores, una que busca aspirantes al título con participación y otra que favorece categorías bajas. Dos carreras exploratorias de una política sustituida se excluyeron y quedaron archivadas como superseded-policy.json; no se cuentan en las 560.

Se comprueba que veinte títulos de tercera no superen tres de primera en el bloque de palmarés, con las condiciones del caso de prueba. Eso no garantiza que siempre pierdan en el total: una carrera puede tener mejor rendimiento, más minutos y otros logros.

La política ambiciosa aparece entre las ganadoras en ${summary.validation.winners.ambitious??0} de los 21 contextos de evaluación, incluidos empates. Es un incentivo compatible con el objetivo de palmarés, pero la muestra no demuestra ausencia de una ruta dominante. No se ha buscado exhaustivamente el óptimo de las 30 decisiones ni se han recogido partidas humanas.

El mayor salto entre carreras agrupadas con el mismo crédito de títulos fue de **${summary.validation.maxEqualPalmaresGap} puntos**. Esas carreras pueden diferir en rendimiento, participación y logros individuales; no se presenta como igualdad de resultados garantizada por posición. Tres semillas nuevas permiten detectar problemas, no estimar con precisión el comportamiento de todos los futuros Daily.

Los parámetros no se reajustan con participantes reales ni con el Top del día. La escala sobre 1.000 es un presupuesto máximo; no se ha demostrado que se pueda alcanzar en cualquier reto. Las puntuaciones anteriores y posteriores no se mezclan en un mismo ranking.

## Código y verificación

- reddit/shared/daily-score-candidate.mjs: extractor de hechos, cálculo, eventos acreditados y desglose compatible con total/breakdown.
- reddit/shared/daily-score-calibration.json: constantes y 42 referencias congeladas; estado candidate-not-activated.
- reddit/test/daily-score-candidate.test.mjs: ${count} pruebas de equidad relativa, minutos, límites, repetición, calendario, importación compacta, atributos finales, falsos títulos de resumen, precisión del desglose y huella de implementación.
- scripts/calibrate-daily-score.mjs: generación/reanudación de cohorte y ajuste reproducible.
- cohort.json, results.json, summary.json y diagnostics.json: hechos, puntuaciones individuales y métricas.

La configuración tiene huella SHA-256 **${config.sha256}**, junto a las huellas del productor y del cálculo. Se validan su integridad, separación de semillas y cobertura mínima. El módulo no está importado por daily-run.mjs, por lo que no altera los Daily actuales.

\x60\x60\x60sh
node scripts/calibrate-daily-score.mjs
node --test reddit/test/daily-score-candidate.test.mjs
node scripts/report-daily-score-calibration.mjs
\x60\x60\x60

El primer comando reutiliza cohort.json si ya existe: puede recalcular las referencias y puntuaciones en menos de un segundo sin repetir partidos. Ese tiempo no representa la generación de 560 carreras. Las ejecuciones de simulación están en el log original; final-calibration.log corresponde al recálculo de los hechos ya guardados.

## Integración posterior

La calibración queda como candidata concreta y evaluable. Para usarla en el juego hay que introducir una versión nueva de reglas/score, conservar el ID y la configuración en el intento, exponer los logros y el crédito en la interfaz, y verificar guardado y ranking con esa versión. No se ha elegido una fecha de activación, modificado el servidor actual ni realizado una subida a Reddit en esta tarea.
`;
fs.writeFileSync(`${dir}/INFORME.md`,md);console.log(JSON.stringify({configuration:config.id,tests:count,diagnostics,validation:summary.validation}));
