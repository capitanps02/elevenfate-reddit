# Portada Reddit — avance de implementación

12 de octubre de 2026. PR #4; código en borrador, no publicado.

## Avance estimado: 65 %; pendiente: 35 %

Es una estimación de trabajo completado, no una certificación funcional ni visual. Los pesos se fijan para no tratar la traducción completa como un pequeño botón. Cada porcentaje de pasada incluye preparación y código; PASS final exige sus gates.

| Pasada | Peso | Avance estimado | Aporte al total | Situación |
|---|---:|---:|---:|---|
| P0 Baseline | 8 % | 75 % | 6 % | Reddit 0.1.6 e Inicio inspeccionados; correspondencia SHA/bundle pendiente |
| P1 Contrato | 10 % | 90 % | 9 % | Especificado; revisión final contra versión publicada pendiente |
| P2 Portada | 15 % | 80 % | 12 % | Menú implementado; validación gráfica pendiente |
| P3 Flujos | 20 % | 95 % | 19 % | Navegación Atrás/Adelante implementada y probada en modelos; validación en Reddit pendiente |
| P4 ES/EN | 20 % | 40 % | 8 % | UI Daily, 24 escenas de reserva y seis etapas conectadas; historias originales, carrera y arranque pendientes |
| P5 Simular | 5 % | 80 % | 4 % | Selector ausente en Inicio publicado 0.1.6; candidato pendiente de comparación |
| P6 Arte/a11y | 10 % | 10 % | 1 % | Estilos y targets iniciales; arte final y QA real pendientes |
| P7 Certificación | 8 % | 70 % | 5,6 % | CI completa de portada/localización PASS; 54 tests locales PASS; CI UI Daily PASS, nueva CI de metadatos pendiente |
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
