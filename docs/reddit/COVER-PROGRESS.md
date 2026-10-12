# Portada Reddit — avance de implementación

12 de octubre de 2026. PR #4; código en borrador, no publicado.

## Avance estimado: 72 %; pendiente: 28 %

Es una estimación de trabajo completado, no una certificación funcional ni visual. Los pesos se fijan para no tratar la traducción completa como un pequeño botón. Cada porcentaje de pasada incluye preparación y código; PASS final exige sus gates.

| Pasada | Peso | Avance estimado | Aporte al total | Situación |
|---|---:|---:|---:|---|
| P0 Baseline | 8 % | 75 % | 6 % | Reddit 0.1.6 e Inicio inspeccionados; correspondencia SHA/bundle pendiente |
| P1 Contrato | 10 % | 90 % | 9 % | Especificado; revisión final contra versión publicada pendiente |
| P2 Portada | 15 % | 80 % | 12 % | Menú implementado; validación gráfica pendiente |
| P3 Flujos | 20 % | 95 % | 19 % | Navegación Atrás/Adelante implementada y probada en modelos; validación en Reddit pendiente |
| P4 ES/EN | 20 % | 70 % | 14 % | Daily, creación, arranque, Tu partida, Inicio compacto y controles de calendario conectados; relatos/paneles y datos deportivos dinámicos de carrera pendientes |
| P5 Simular | 5 % | 80 % | 4 % | Selector ausente en Inicio publicado 0.1.6; candidato pendiente de comparación |
| P6 Arte/a11y | 10 % | 20 % | 2 % | Inicio ES/EN revisado en seis tamaños; foco y recorte Daily corregidos; arte final, zoom y resto de pantallas pendientes |
| P7 Certificación | 8 % | 75 % | 6 % | CI de d243f10 completa PASS; 205 regresiones anteriores PASS; bloque actual build/127 Reddit y contratos PASS |
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
