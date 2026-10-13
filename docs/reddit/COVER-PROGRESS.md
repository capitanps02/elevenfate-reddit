> Dirección vigente (13-Oct-2026): [ROADMAP.md](ROADMAP.md). Este archivo conserva evidencia histórica; sus porcentajes y siguientes pasos no reabren tareas. El proyecto independiente de inglés debe localizarse y reutilizarse antes de declarar trabajo pendiente.

# Portada Reddit — avance de implementación

13 de octubre de 2026. PR #4; código en borrador, no publicado.

## Avance estimado: 76 % (75,6 % ponderado); pendiente: 24 %

Es una estimación de trabajo completado, no una certificación funcional ni visual. Los pesos se fijan para no tratar la traducción completa como un pequeño botón. Cada porcentaje de pasada incluye preparación y código; PASS final exige sus gates.

| Pasada | Peso | Avance estimado | Aporte al total | Situación |
|---|---:|---:|---:|---|
| P0 Baseline | 8 % | 75 % | 6 % | Reddit 0.1.6 e Inicio inspeccionados; correspondencia SHA/bundle pendiente |
| P1 Contrato | 10 % | 90 % | 9 % | Especificado; revisión final contra versión publicada pendiente |
| P2 Portada | 15 % | 80 % | 12 % | Menú implementado; validación gráfica pendiente |
| P3 Flujos | 20 % | 95 % | 19 % | Navegación Atrás/Adelante implementada y probada en modelos; validación en Reddit pendiente |
| P4 ES/EN | 20 % | 88 % | 17,6 % | Controles de decisiones, resultados y ofertas localizados; historias, noticias, roles generales y cobertura narrativa/cinemáticas pendientes |
| P5 Simular | 5 % | 80 % | 4 % | Selector ausente en Inicio publicado 0.1.6; candidato pendiente de comparación |
| P6 Arte/a11y | 10 % | 20 % | 2 % | Inicio ES/EN revisado en seis tamaños; foco y recorte Daily corregidos; arte final, zoom y resto de pantallas pendientes |
| P7 Certificación | 8 % | 75 % | 6 % | CI oficial de 75f8875 SUCCESS (365 pruebas); nueva integración de escenas en validación, gates visuales/Reddit todavía pendientes |
| P8 Reddit real | 4 % | 0 % | 0 % | Sin prueba ni publicación del candidato |

Quedan seis pasadas principales de ejecución: cerrar P3, P4, P5, P6, P7 y P8. También siguen pendientes las comprobaciones de cierre de P0/P1/P2; no se consideran certificadas. No hacen falta nuevas pasadas inventadas para esos controles: se cierran dentro de las existentes.

## Cambio de esta iteración
Nueva partida tiene una vista enfocada, nombre dinámico y código de historia bajo opciones avanzadas. Reutiliza el mismo flujo de creación que Tu partida. La primera carrera no pide confirmación de sobrescritura; una carrera existente sí. El formulario conserva lo escrito si falla la creación y rechaza el código vacío.

Pruebas locales: 14/14 PASS de entrada/portada y formulario con DOM simulado, sin validación de layout. CI completa anterior 2479621af694e44dd4c8cd67da58e0b404c28e8e: PASS (build, Reddit, guardado, sesión e interfaz). Cambios de esta iteración requieren nueva CI. El navegador local no está instalado; no afirmar screenshots ni revisión visual.

## Continuación: tutorial y acceso Reddit
Tutorial con La lista de 26, tres choices por ID y resultados primarios como ejemplos explícitos. Muestra de presentación sin engine, RNG, Redis ni intento Daily. Saltar entra en modo apropiado solo con disponibilidad confirmada; Escape vuelve al menú y limpia su listener. 21/21 pruebas locales PASS.

La CI de 3068975e86d563a6323743bd3cd268c6a3ce107d pasó 46 pruebas Reddit y 177 de sesión/guardado, pero falló 1/28 comprobaciones de UI por redacción del código de historia. La frase contractual se ha restaurado; requiere nueva CI. El último PASS completo sigue siendo 2479621af694e44dd4c8cd67da58e0b404c28e8e.

## Continuación: navegación segura
Atrás/Adelante de la capa de entrada reconoce portada/carrera/Daily y conserva la navegación interna de carrera. Escape sale de creación o Inicio sin escribir. Se puede abandonar una lectura lenta; se bloquea la salida mientras una escritura o confirmación está en curso. Las respuestas tardías no montan una sesión ni reactivan timers después de salir. Daily permite salir durante GET y espera confirmación durante POST. 30/30 pruebas locales PASS.

La CI completa de 26eda35c51655a790ca5e19ea6f6b74f29d7002a pasó build, Reddit, sesión, guardado e interfaz: la regresión de microcopy está resuelta. Nueva CI necesaria para esta iteración. El porcentaje 56% redondea 55,8% según pesos; no certifica dispositivo ni rendimiento. P3 está implementada en gran parte pero requiere probar Atrás real en webview/SDK; quedan seis pasadas principales contando su cierre.

## Continuación: base de localización ES/EN
Se reutilizan sin modificaciones los JSON de PR #3 (74d60cf0224bcd59b06f03f98176741006905406). El catálogo combinado tiene 152 claves UI: 99 iniciales y 53 de portada/tutorial, con paridad de claves y parámetros. Un adaptador de presentación persistente, aislado de save/Redis/motor, conecta la portada y el tutorial. English se prueba mediante inyección del adaptador; la entrada de producción mantiene availableLocales=[es] hasta cobertura íntegra.

40/40 pruebas locales PASS, incluyendo cambio de idioma durante tutorial, elección preservada, storage bloqueado y errores localizados. La CI de 154d466333165bf5d1babc3dca388b571b8640a9 pasó build/62 pruebas Reddit/177 sesión y guardado; falló 1/28 contratos de UI porque la condición de bloqueo de botones cambió de forma. Se restaura el bloqueo general busy y se deja una excepción explícita solo para controles de salida durante una lectura. Los tests locales del guard y de salidas durante lectura/escritura pasan; nueva CI necesaria. Último PASS completo sigue siendo 26eda35c51655a790ca5e19ea6f6b74f29d7002a.

La cifra 61% redondea 60,8% ponderado. No equivale a 61% de textos traducidos ni a una localización completa. Continúan pendientes carrera, Daily canónico completo, creación, login/error de arranque, helpers de Intl, errores de recuperación, equivalencia determinista y Reddit bilingüe real. La duración del tutorial y los layouts EN aún no se han medido visualmente.

## Continuación: interfaz Daily bilingüe
Daily recibe el mismo adaptador que la portada. Usa claves para intro, práctica, reglas, ranking, contratos, indicadores, resultados deportivos, resúmenes, cierre y recuperación. Intl cambia el idioma de fecha manteniendo UTC. Las etiquetas pendientes dependen de read/write, no de palabras traducidas; salir durante lectura y bloquear durante escritura funciona en ambos idiomas. La vuelta desde portada anuncia «Volver al menú». Los errores originales en ES se conservan; EN muestra un fallback localizado mientras no hay códigos semánticos de error completos.

El catálogo combinado tiene ahora 155 claves UI (99 originales, 53 portada/tutorial, 3 de formato/retorno Daily); los JSON iniciales se conservan intactos. No cambian comandos, IDs, revisiones, puntuaciones, tablas ni nombres propios. Los textos dinámicos del servidor se conservan sin traducciones deducidas por texto: títulos/cuerpos/opciones/resultados canónicos, nombres de etapas, trofeos, formatos y fases deportivas siguen pendientes. La vista pública Daily actual no envía eventId, y el historial persistido no conserva eventId/choiceId; se requiere diseñar metadatos aditivos y compatibilidad con partidas antiguas antes de traducir por IDs. No se ha modificado el servidor ni el estado persistido en esta pasada.

48/48 tests locales PASS: comandos equivalentes ES/EN, bloqueo de escrituras y selección durante cambios de idioma, reglas/ranking UTC, tablas/resultados/resúmenes, recuperación y listeners. Usan DOM simulado; no certifican motor determinista ni layout. La CI completa de db16e82b2166eab86bd8513f8336a35927c224ae PASS incluye build, Reddit, sesión/guardado y contratos UI: restaurado A4-012. Esta iteración Daily requiere su propia CI. English continúa desactivado en game.mjs.

64% redondea 63,6% ponderado. Quedan las mismas seis pasadas principales: cerrar P3, P4, P5, P6, P7 y P8; incluye cierres pendientes de baseline, contrato y portada. No es porcentaje de traducción ni certificación de publicación.

## Continuación: IDs públicos e historias Daily
La vista pública añade eventId a decisiones y stageId a etapas/resúmenes. Se proyectan en dailyRunView; no se escriben en run, historial, schema, semillas ni receipts. La elección y los outcomes siguen resolviéndose en el mismo motor. El historial antiguo conserva compatibilidad y su cobertura EN continúa pendiente; no se reconstruyen IDs a partir de texto.

La presentación conecta las 24 escenas Daily de reserva, sus 72 opciones mostradas (12 etiquetas distintas reutilizadas) y las seis etapas por ID con el JSON de PR #3. English rechaza una historia canónica sin traducción o una elección sin clave; muestra un aviso accesible y ninguna elección en esa vista de prueba, y volver a ES recupera el original sin otra solicitud. No hay traducción de historias originales, resultados/consecuencias, historial ni todos los honores/formatos deportivos todavía. El selector público English permanece bloqueado. El catálogo UI tiene 157 claves con dos textos de aviso nuevos.

54/54 pruebas locales PASS, incluyendo paridad completa de escenas de reserva, ausencia de mutación y bloqueo de cobertura ausente. Un test de integración con motor comprueba la proyección sobre runs antiguos, stageId de resúmenes y serialización idéntica del run: se ejecutará en CI, al faltar dist compilado en el entorno local parcial. La CI completa de 92905e7c60c6caac07e925e480b2da4e044a9b5b PASS (build, Reddit, sesión/guardado, UI); metadatos y escenas requieren nueva CI.

65% redondea 64,6% ponderado. Continúan seis pasadas principales, con P4 avanzando sin certificar el juego bilingüe.

## Continuación: inventario real, consecuencias e historial
Se reconstruyó el catálogo final con sus reemplazos y reparaciones desde b253155c1ff89ecf283048704ad6e815c560b18b. EVENTS contiene 388 escenas originales. Aplicando exactamente la política Daily actual, los conteos sucesivos son 388 → 110 → 9 → 2 → 2 → 0 → 0; ningún original es elegible. El Daily actual usa las 24 escenas de reserva. Esto corrige la incertidumbre anterior sobre «Daily canónico completo»; no elimina ni cambia las historias de carrera. La misma política se extrae a daily-story-policy.mjs sin modificar criterios; CI registra el inventario y exige revisar cobertura si empieza a admitir originales.

El motor ya conserva eventId/choiceId/outcomeId en run.state.history. Aunque el historial público antiguo carece de esos IDs, ahora se proyectan desde ese registro interno usando la cadencia de 1 club + 4 historias, con validación de conteo, edad y orden de eventos. No se reescribe ningún run ni receipt. El historial y el último resultado se traducen por esos metadatos; registros incompatibles muestran disponibilidad en español, sin adivinar. Se traducen los 72 resultados posibles de reserva y las elecciones de club (fichar/quedarse).

La presentación deportiva añade divisionId (27 divisiones ficticias), honourId (4 distinciones), formatId y stageId de grupo/eliminatorias. Los textos legacy usados para honores y fases son enums fijos del simulador; se convierten a códigos públicos en una capa de compatibilidad, sin cambiar sus valores persistidos ni los textos que alimentan las claves RNG. Los nombres de clubes, calendarios, marcadores, ganadores, penaltis y tablas permanecen iguales. clubStatus permite traducir «Sin equipo» sin comparar nombres. El catálogo UI tiene 158 claves; deportes tienen su catálogo por IDs.

64 pruebas locales de presentación/DOM simulado PASS. También 12/12 pruebas Daily PASS sobre las fuentes del motor auditadas localmente (Node 24 con transformación TS y rutas de importación adaptadas en copia temporal); incluyen tres estrategias completas, guardado/reload, ranking, estadísticas y proyección sin mutación. Tras añadir deporte, se repitieron las tres comprobaciones de inventario/carreras completas/metadatos: 3/3 PASS. Esto no sustituye compilación oficial ni QA visual. CI completa anterior b253155c1ff89ecf283048704ad6e815c560b18b PASS; esta iteración requiere nueva CI.

67% ponderado exacto: P4=50%, P7=75%; el resto de pesos y avances se conserva. Siguen seis pasadas principales. English permanece deshabilitado: faltan carrera, creación/arranque, códigos semánticos de recuperación, revisión visual y equivalencia certificada en el build final/Reddit. El Daily está mucho más cubierto, pero no se certifica el juego completo bilingüe ni publicado.

## Continuación: creación de partida y arranque
mountGame acepta un adaptador opcional de presentación; sin inyección conserva los textos ES. Reddit lo comparte con portada/Daily. Se incorporan 47 claves de creación, cabecera/navegación, validaciones, estados pendientes, avisos de carga y arranque (205 claves UI totales). La preferencia de arranque usa su propia clave y no escribe durante la construcción; al cambiar la preferencia por cuenta se sincroniza la de arranque. Ambas entradas conservan availableLocales=[es].

El formulario mantiene nombre, código, foco/selección y opciones abiertas durante un cambio de idioma. La confirmación existente se traduce sin cerrarla, mantiene bloqueo de salida y confirma una sola escritura incluso con dos activaciones. Los estados internos read/write se separan del texto mostrado; salir durante carga inicial sigue permitido, crear/sustituir sigue bloqueado. Ningún locale entra en GameSession.create ni commit. Las fechas/moneda/decimales de cabecera usan locale y UTC manteniendo EUR y sus valores. El código de historia y la frase contractual ES siguen presentes.

mountBootPresentation localiza login, carga fallida y reintento antes de autenticar, anuncia el error y centra el título. Los fallos internos de arranque no se muestran como contenido al jugador. La capa no hace fetch, autenticación ni escrituras de partida. Durante creación, ES conserva el error original y EN usa un mensaje de recuperación localizado para errores sin código semántico. El resto del contenido de carrera permanece sin traducir: no se afirma que la cabecera bilingüe complete las escenas ni todos los paneles.

74/74 pruebas locales PASS: siete nuevas de creación bilingüe y tres de arranque, además de la regresión previa. DOM simulado, sin QA visual ni dispositivo. CI completa anterior 172da7624a0b2012153eda9421103f7a4553229e PASS; esta iteración shared UI requiere nueva CI de build, guardado/sesión y contratos UI.

69% ponderado exacto: P4=60%; P7 permanece 75% hasta validar el nuevo HEAD. Siguen seis pasadas principales. Pendientes para habilitar English: pantallas y relatos de carrera, recuperación semántica completa, cinematics/formatos restantes, equivalencia de presentación del build final y QA visual/Reddit.

## Continuación local: copias y recuperación

Recuperada la rama del PR #4 desde 3c7061f0a55fc6c94b757116706d14c88f0beed2. Su CI oficial terminó SUCCESS (run 38283769252). Este estado reemplaza la indicación anterior de CI pendiente para ese commit.

37 claves adicionales en career-save-catalog.mjs: 242 claves UI ES/EN en total. Tu partida localiza controles, ayuda, copia anterior/antigua, importación y confirmación de eliminación. La confirmación de importación recalcula fecha y número de decisiones según locale sin cambiar candidato ni backup. Cancelar no escribe; la confirmación sigue bloqueando salida y doble activación. Los errores conocidos de revisión/conflicto/conexión tienen consejo específico EN; importaciones incompatibles usan consejo recuperable sin filtrar detalles internos. ES mantiene los mensajes existentes. No se cambia save-store, servicio, motor ni schema.

Ocho pruebas nuevas PASS con DOM simulado. Build/configuración y 117/117 pruebas Reddit PASS mediante verify:reddit. Regresiones de sesión, saves y contratos de interfaz: resultado se registra al finalizar. No equivale a validación visual o Redis real.

70% ponderado exacto: P4 pasa de 60% a 65%; demás pesos y avances sin cambios. No mide porcentaje de textos traducidos. Quedan seis pasadas principales (P3/P4/P5/P6/P7/P8) y comprobaciones de cierre de P0/P1/P2. English continúa desactivado; candidato sin publicar.

Siguiente ejecución:
- P4: paneles Inicio/Carrera/Mundo/Relaciones/Perfil, historias/resultados y cinematics por IDs, formatos y errores restantes.
- P3/P5: navegación y preservación de estados en webview, comparación de Simular con baseline.
- P6: composición artística, recortes, tamaños, foco, contraste, zoom y estados ES/EN reales.
- P7: equivalencia de snapshots/scores, ciclos de navegación, peso/latencia, build final y CI.
- P8: candidato en Reddit real y revisión de publicación.

Inspección visual local ES: portada en 320×480 y 390×844. Los seis controles aparecen en el árbol accesible; targets de acciones 48 px mínimo y fila de idiomas en paralelo (139 px por control en 320 px). El host permite scroll para el estado inferior en poca altura. Nueva partida y Tu partida abren desde controles reales. No se creó ni eliminó una carrera en el navegador. Preview con almacenamiento en memoria, sin evidencia de Redis ni webview Reddit. El recorte/artista, resto de tamaños, EN, zoom y foco requieren P6 completa.

Corrección de estado vacío: sin sesión abierta, Tu partida no declara que el guardado automático esté activo ni identifica un último estado confirmado. Se repitieron los 8 tests de recuperación y 28 contratos UI: 36/36 PASS, y se reconstruyó el bundle.

## Continuación: Inicio, simulación y calendario ES/EN

CI oficial del bloque de recuperación d243f10dedfa464917e1bfe5b1e6ed82cba159b1 SUCCESS (run 38305056864). La regresión local ampliada anterior también terminó: 205/205 PASS.

career-home-catalog.mjs añade 76 claves (318 UI combinadas). Inicio compacto localiza identidad/posición por enum, métricas, ayuda, títulos neutros, acción principal y acceso Daily. Los estados de simulación, pausa/reanudación, progreso y fecha de guardado también se localizan en el render completo y en la actualización ligera. Los títulos/cuerpos narrativos y las propuestas originales permanecen intactos: este bloque no certifica traducción de la historia ni de Inicio completo no compacto.

Calendario localiza controles, tablas, fechas y avisos; conserva el diálogo y la pestaña seleccionada al cambiar idioma. Nombres de divisiones, formato y fases dinámicas de carrera todavía requieren metadatos por ID y cobertura EN; no se traducen por texto. Foco de acción principal, navegación, menú, pausa y fecha vuelve al mismo control tras cambiar locale. Un render por navegación limpia el callback de un diálogo retirado.

Verificación: diez nuevas pruebas runtime con DOM simulado PASS, incluyendo paridad del comando principal ES/EN/default ES, preservación de PlayerView/calendario/score, estados pendientes, progreso accesible, pestaña, foco e historial del navegador. Build/config y 127/127 tests Reddit PASS. 53 checks combinados de Home, creación, recuperación y contratos UI PASS; 28 contratos repetidos tras ajuste CSS PASS. El contrato histórico de CTA ahora admite el adaptador explícito además del literal ES; la prueba runtime exige type/revision/action/maxDays idénticos.

QA visual local aislada con fixture marcado, sin escrituras de carrera: 320×480, 360×800, 390×844, 412×915, 375×600 y 900×650, sin overflow horizontal. Se detectó recorte de Daily a 320×480 en ES: main tenía overflow:hidden, scrollHeight=391 frente a clientHeight=376. Cambiado a overflow-y:auto; End permite scrollTop≈15 y el Daily queda íntegro dentro del área principal. El grid de Daily usa minmax(0,1fr) y wrapping para texto largo. El harness QA vive en work; sus archivos se retiran de reddit/public y no se envían con el juego. Los selectores de idioma del harness no forman parte de Simular.

Decisión visual COVER-OVERFLOW-001: ACTUAL overflow:hidden en Inicio; PROPUESTO scroll vertical solo cuando falta altura; COMPONENTE main.reddit-home; MOTIVO acceso completo a Daily sin reducir texto; RIESGO aparición de scrollbar en plataformas que no lo superponen; ROLLBACK restaurar la regla anterior. CSS compartida Android intacta. Esto no cierra la dirección artística ni P6 entera.

72% ponderado exacto: P4=70% (14 puntos) y P6=20% (2 puntos); los demás pesos/avances siguen iguales. Quedan seis pasadas principales y controles de cierre P0/P1/P2. Siguiente bloque: contenido/paneles de carrera y deporte dinámico por IDs; después arte final, equivalencia del candidato y webview Reddit. English sigue desactivado, PR en borrador y candidato sin publicar.

## Continuación: deporte por IDs y paneles de carrera

CI de a011fada758f1d622fd1ee2ef6c5ab71785876b0 SUCCESS (run 38306307786). Su bloque de Inicio/foco queda validado por la CI oficial; eso no cierra P7 completa.

La proyección de carrera añade divisionId en rutas nuevas y legacy, y formatId/stageId en la copa. La transformación pública de Daily se mueve a shared/sports-presentation.mjs con reexport compatible; criterios, scores y enum values del simulador no cambian. El adaptador deportivo reutiliza 27 divisiones, formato de grupos/eliminatorias, ocho grupos y cuatro fases de la traducción Daily. Devuelve una copia de presentación, conserva tabla/equipos/fechas/score/penaltis/ganador y nunca invalida el cache de sesión ni cambia estado persistido. Una cobertura EN ausente muestra un aviso accesible dentro del diálogo; ES recupera el original sin otra lectura.

Perfil traduce identidad, contrato, duración/moneda y ayuda. Un borrador de nombre por sessionId conserva texto y foco al cambiar locale; el comando identity solo se envía al guardar y es idéntico en ambos idiomas. Fallo de guardado conserva el borrador; guardar con éxito lo limpia. Mundo y Relaciones localizan la estructura y estados vacíos, manteniendo noticias, nombres y roles originales: sus datos narrativos todavía necesitan cobertura por IDs, no se deducen por texto.

Catálogo: 33 claves nuevas (351 UI combinadas): una de cobertura deportiva y 32 de paneles, incluida duración singular. Doce pruebas nuevas cubren cinco casos de deporte/proyección, un caso de cobertura ausente en diálogo y seis de Perfil/Mundo/Relaciones. Runtime deportivo inicial 19/19 PASS; paneles/catálogos/contratos previos 40/40 PASS. Build/config y 139/139 pruebas Reddit finales PASS; 28 contratos de interfaz repetidos sobre el código final PASS.

QA visual local con fixture claramente marcado: Perfil EN a 390×844, nombre editado sin guardar conservado al pasar ES→EN, controles accesibles y scroll. No se pulsa Guardar ni se modifica una carrera real. Se retiran los archivos QA de reddit/public; no se publica el selector usado por el harness. Motor/schema/servicios de guardado intactos.

### Contador de pasadas actualizado

- Previstas: 9, P0–P8.
- Principales de ejecución pendientes: 6, P3/P4/P5/P6/P7/P8.
- P0/P1/P2 conservan comprobaciones de cierre; no se anuncian como certificadas.
- En este bloque se cierran tareas deportivas y de Perfil dentro de P4. P4 queda al 75%, no PASS; por eso el contador principal aún no baja.
- Se reducirá el contador al cerrar el gate de una pasada, no por cada commit o grupo de traducciones. No se añaden pasadas nuevas para estos ajustes.

73% ponderado exacto: P4 sube de 70% a 75%, de 14 a 15 puntos. El resto permanece igual. Pendientes inmediatos: Carrera y acciones voluntarias; textos narrativos de decisiones/resultados/ofertas/news/contact roles y cinematics; revisión artística final, determinismo completo y Reddit real. English continúa desactivado y el candidato en borrador, sin publicar.

## Continuación: Carrera y acciones voluntarias

CI oficial de 332256ef64fe4621cbd59ef5679ec633c0a66423 SUCCESS (run 38307485811). Este bloque requiere su propia CI; no certifica publicación.

91 claves en career-record-catalog.mjs: total 442 UI. Carrera localiza estructura, temporadas, último partido, participación, hitos deportivos/edad, vacío e indicadores de retirada por enums públicos. Los registros narrativos y ofertas conservan su texto original; el resumen de simulación y Home no compacto todavía tienen campos pendientes. Los flags y cifras no se reconstruyen ni cambian.

player-action-content.mjs contiene 20 acciones ejecutables y 31 opciones, con label/description/option/publicResult ES/EN. El test de cobertura exige que ES coincida exactamente con el catálogo runtime y que EN tenga los mismos IDs. No se traduce ni activa una acción bloqueada fuera del catálogo ejecutable. UI de acciones localiza ayuda, controles, estados y fechas públicas de cooldown; conserva categorías/acción/persona seleccionada, foco y el payload real del comando. Motivos de indisponibilidad sin código y roles de objetivos siguen originales y permanecen pendientes.

Necesidad de proyección: el historial persistido ya guarda actionId/optionId, pero PlayerView no exponía optionId ni ambos IDs en lastResult. Se añaden solo esos identificadores a publicPlayerActionsView y sus tipos. No se cambia ejecución, efectos, recepción de comandos, commits, schema ni datos persistidos. Se actualizan dos contratos de privacidad para admitir optionId; siguen prohibidos causal facts/effectKey/RNG y demás datos privados. Los outputs dist ya versionados se regeneran desde esa fuente.

Historial y último resultado se traducen por actionId/optionId, verificando que el texto ES coincide con la muestra canónica. Un registro ambiguo o desfasado muestra disponibilidad en Español sin deducir IDs ni fabricar un resultado; ES vuelve al mismo original. Acción nueva sin catálogo EN bloquea el menú de acciones con aviso accesible y vuelta a Carrera. No bloquea la carrera entera ni vuelve a ejecutar una elección.

Verificación: doce tests nuevos runtime/catálogo/carrera/acciones PASS. 55 pruebas de sesión, proyección y contratos UI PASS. Build/config y 151/151 pruebas Reddit finales PASS; los doce tests nuevos también PASS tras el ajuste del aviso accesible. Comparación independiente contra la GameSession de 332256e: seed 424242, sessionId fijo, events=[]; snapshots byte a byte idénticos después de crear y de ejecutar entrenamiento técnico, publicación profesional, identidad y avance de 7 días; PlayerView idéntica al retirar únicamente los IDs añadidos. 100 lecturas no cambian snapshot/RNG. Cargar el snapshot anterior conserva los bytes y proyecta IDs sin escribir ni migrar datos. Esta evidencia está acotada a esos casos; CI y gates completos siguen pendientes.

QA visual local sin writes: Carrera vacía, siete categorías y detalle de Entrenamiento en EN a 390×844; ES→EN conserva el mismo detalle. A 320×480 no hay overflow horizontal, main tiene scroll vertical, opciones miden 50 px de alto y Volver 48 px. No se ejecutan opciones en el navegador. Fixtures marcados y selector externo al juego; archivos QA retirados del bundle final. Arte final y revisión de todas las pantallas no se consideran cerrados.

### Contador tras esta iteración

9 pasadas previstas. Siguen 6 principales pendientes: P3, P4, P5, P6, P7 y P8; P0/P1/P2 tienen comprobaciones de cierre pendientes. P4 pasa a 80%, sin PASS todavía. Esta iteración cierra tareas de Carrera y acciones dentro de P4; no se descuenta una pasada sin superar su gate. Próximo bloque: mensajes semánticos/roles y resúmenes, seguido de narrativa de carrera por IDs y cinematics.

74% ponderado exacto: P4=80%, aporte=16 puntos; resto sin cambios. English sigue desactivado en producción; candidato en borrador y sin publicación.



## Continuación: bloqueos públicos, roles de objetivos y resumen del periodo

Base revisada: a93c2d6df3560bcadb9eb5fa389814023113e2d1, CI SUCCESS (38309306163). Se conserva todo el trabajo posterior al antiguo 69%; no se reutilizan los borradores locales anteriores.

player-action-availability.mjs cubre 13 mensajes públicos y 10 roles de objetivos del registro ejecutable. Son copias cerradas de presentación: se exige coincidencia exacta con el mensaje público ES y, para roles, con el par NPC id/rol público. No se añaden códigos al motor ni al save, no se inspeccionan perfiles/agendas y no se infiere elegibilidad. El cooldown exige mensaje completo y fecha pública coincidente. Un mensaje o rol nuevo/desfasado ofrece disponibilidad de los detalles en Español; mantiene las mismas opciones, booleans, IDs, nombres, fechas y comandos. Una prueba exige que las fuentes coincidan con eligibility/session y el registro público. Las razones se presentan en sesión, acción, opción, persona y opciones de persona.

career-period-catalog.mjs agrega 28 claves: 470 UI combinadas ES/EN. El resumen del periodo presenta fechas UTC, singular/plural de días/semanas, estadísticas, cabecera de cambios de carrera, seis participaciones públicas exactas, notas, historial deportivo y diez tipos de interrupción por enum. Un tipo de interrupción nuevo usa el mensaje genérico; participación desconocida ofrece detalles en Español. Narrativas de worldHighlights/report.context y roles deportivos de carrera se conservan: no se certifica traducción de esos campos. Home no compacto aún requiere revisión de cobertura. No se añade selector de idioma a Simular.

Verificación local: 9 pruebas nuevas y 12 previas, 21/21 PASS sobre los módulos dist exactos de la base revisada. Incluyen cobertura de fuentes, campos de disponibilidad en todos los niveles, desconocidos/cooldown, roles por ID, reporte singular/plural/participación/interrupciones, bloqueo de opciones, foco/selección y comandos ES/EN existentes, snapshots y objetos sin cambios, sin escrituras al cambiar locale. No sustituye la CI oficial ni una revisión visual real en Reddit; CI del nuevo commit pendiente al redactar. Motor, tipos, proyección, dist, persistencia, estilos y assets no se modifican en esta iteración.

75% ponderado: P4 sube de 80% a 85% (17 puntos); resto sin cambios. De 9 pasadas previstas siguen 6 principales abiertas, P3/P4/P5/P6/P7/P8, más comprobaciones finales de P0/P1/P2. Próximo bloque: narrativa de carrera por IDs (decisiones/resultados/ofertas), news/roles generales y cinematics; luego revisión artística completa, equivalencia y Reddit real. English sigue desactivado en producción; candidato en borrador y sin publicar.


## Continuación 13-Oct: interfaz de decisiones, resultados y ofertas (P4)

Base verificada: 75f887511b (CI completa SUCCESS, 365 pruebas, cero fallos). Los cambios de esta continuación se incorporan en PR #4, rama feat/reddit-cover-entry-20261012; versión aún no fusionada ni desplegada.

career-interactive-catalog.mjs añade 38 claves UI con paridad de parámetros ES/EN: 508 claves UI combinadas. En la capa de presentación se localizan etiquetas de la escena de decisión, encabezados y resúmenes del resultado, términos visibles de contratos, condición de cesión, explicación de delegación, controles y nombres accesibles de grupos de opciones. Todos los IDs narrativos, títulos, cuerpos, resultado de la decisión, efectos, razonamientos de ofertas y contratos de historial permanecen originales. English no se habilita hasta traducción completa y certificación.

Se añaden identificadores de foco exclusivamente DOM (choices por choiceId, resultado y respuesta oferta por action) para recuperar el mismo control al cambiar de idioma; el comando sigue usando los ID originales. La capa no altera GameSession, persistencia, RNG, scoring, servidor, API ni paquetes Android. El test career-interactive-locale.test.mjs cubre catálogos, traducción y preservación de foco, y comprueba igualdad de las órdenes choose/acknowledge/offer después de cambiar locale. Requiere CI oficial del HEAD y QA de cinematic en Reddit real: las pruebas DOM son simuladas y no prueban composición visual.

Avance ponderado estimado: 75,6% (redondeado 76%). El aumento P4=85→88% reconoce traducción del marco interactivo, no el contenido narrativo pendiente. Permanecen **seis pasadas principales abiertas**, P3–P8. P0–P2 todavía tienen gates de cierre cruzados. El porcentaje no constituye PASS de publicación.

### Tareas recuperadas y criterios de cierre

| Prioridad | Pasada | Tarea concreta | Gate de aceptación |
|---|---|---|---|
| Alta | P4 | Traducir decisiones de carrera y opciones por IDs públicos; cubrir el historial, memorias y resultados sin emparejar por texto | Catálogo exhaustivo y prueba de comando/resultados invariantes en ES y EN |
| Alta | P4 | Proyectar identificadores públicos estables para ofertas/noticias sin filtrar datos privados ni cambiar saves; localizar contrato, razones, desenlaces y feed | Fixture de oferta nueva/renovación/cesión, historial antiguo y noticias con fallback verificable |
| Alta | P4 | Localizar roles generales/deportivos, contexto y worldHighlights del periodo, cinematics y Home no compacto | Inventario completo, sin textos españoles inesperados al activar EN; fallback con acceso a ES |
| Alta | P4 | Recuperación semántica y compatibilidad con partidas antiguas/errores de red y Redis | Mismos saves, versiones, revisiones y UI usable tras conflictos/cortes |
| Alta | P3 | Probar Atrás/Adelante/Escape/salida mientras hay GET/POST y diálogos en webview Reddit | Sin montajes tardíos, doble escritura ni pérdida de foco/carrera |
| Alta | P5 | Comparar pantalla Simular con la build Reddit 0.1.6: sin selector de idioma, métricas y CTA sin regresión | Revisión visual y equivalencia de comandos, estados y navegación |
| Alta | P6 | Acabar arte deportivo de portada: futbolista/estadio, azul-dorado, legibilidad, contraste y loading/empty/error | QA visual 320/360/390/412 px, zoom 200%, orientación y teclado/lector |
| Alta | P6 | Verificar tutorial interactivo breve, saltable y sin escribir/correr Daily | Historia canónica, duración medida y comienzo inmediato sin crear carrera automática |
| Alta | P7 | Ejecutar build candidato, regresión completa, paridad determinista ES/EN, sesgo RNG, tamaño, latencia y memory leaks | CI verde HEAD exacto, snapshots/scores/comandos iguales y budgets documentados |
| Alta | P8 | Probar candidato en Devvit playtest con sesión Reddit, guardado Redis real, Daily, iPhone/Android/web y rollback | Aprobación de release y publicación después de pasar gates anteriores |
| Media | P0–P2 | Vincular SHA, bundle y versión publicada; confirmar contrato UX, foco y recortes de portada | Evidencia sobre el mismo build final, no solo fixtures locales |

Orden inmediato recomendado: P4 narrativa por identificadores → P4 recuperación/roles → P3/P5 y P6 visual → P7 certificación → P8 publicación. No se añade una décima pasada ni se descontarán pasadas hasta superar sus gates.

## Continuación 13-Oct: identificador público y narrativa de carrera por IDs

Base: 9be9d2f92bcf694937c74b5cb7240a5e415743d3, CI oficial SUCCESS (run 38369347373). Se conserva el marco interactivo y sus 508 claves UI. Este bloque añade eventId a la decisión de PlayerView y sus tipos compilados; es el ID de contenido ya guardado en pendingDecision, sin outcomes, pesos ni efectos privados. El save no incorpora ningún campo nuevo.

career-story-locale.mjs selecciona por eventId/choiceId, verifica una copia pública ES contra el contenido final y presenta una copia EN. La primera escena cubierta es EVT_18_PRE_001 («La lista de 26»): título, relato, información visible/incierta y tres opciones. Reutiliza las traducciones del tutorial sin usar sus resultados de ejemplo como consecuencias reales. Las opciones elegibles se conservan en el mismo orden; no se añaden opciones filtradas. La UI muestra el mismo capítulo en Inicio y en la escena, y restaura foco de elección al cambiar idioma. Memorias, resultados, journal, ofertas y resto de escenas siguen pendientes. Contenido ausente/desfasado mantiene el original con aviso accesible; no deduce IDs por texto ni altera elegibilidad.

510 claves UI combinadas. Ocho pruebas nuevas: fuente exacta, paridad de IDs, subconjunto elegible, desconocidos/sin ID, fuente desfasada, privacidad/pureza/reload, paridad de snapshots/resultados/RNG ES/EN y UI/foco/comando real por IDs. 19 pruebas focalizadas PASS; 172 pruebas Reddit PASS y 28 contratos UI PASS. Build TypeScript 5.8.3 y bundle browser del candidato PASS. Comparación independiente con la clase de sesión de la base: mismos snapshots byte a byte y mismas vistas salvo eventId durante cinco decisiones narrativas reales. La regresión larga de sesión y CI del nuevo HEAD se registran al concluir; no se declara PASS de Redis ni webview.

Avance ponderado: **76,0%**, P4=90% como estimación de tareas de la pasada, no porcentaje de relatos traducidos (solo una escena de carrera cubierta por este nuevo catálogo). Siguen seis pasadas principales abiertas, P3–P8, más cierres cruzados P0–P2. English sigue deshabilitado en producción; PR en borrador, sin publicación Reddit. Próximo bloque: inventario/traducción de las restantes escenas y metadatos públicos de resultados, historial y ofertas; después arte/accesibilidad, regresión final y playtest Reddit.
