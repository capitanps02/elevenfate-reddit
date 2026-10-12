# Localización de portada y tutorial — integración inicial

Origen reutilizado: PR #3, feat/english-localization-seed-20261011, SHA 74d60cf0224bcd59b06f03f98176741006905406. es.json/en.json conservan los bytes originales; no se fusiona el resto de la PR ni se afirma que el juego esté traducido.

presentation-locale.mjs combina sus 99 claves UI con 53 claves de cover-catalog.mjs. La fuente ES de la escena tutorial se deriva de tutorial-sample.mjs; English usa los mismos eventId/choiceId y resultados como ejemplos. Se localiza al presentar, sin editar el catálogo narrativo canónico.

El adaptador permite getLocale, isAvailable, setLocale, subscribe y t(key, params). Claves/parametros ausentes fallan explícitamente; nunca se muestran IDs como texto. La preferencia usa una clave separada por cuenta/instalación y no cambia schema, revisiones, semillas, puntuaciones, contenido ni rankings. Storage bloqueado permite continuar en memoria; valores corruptos no bloquean el juego. La creación del adaptador no escribe preferencias.

La entrada game.mjs fija availableLocales=['es']. English sigue deshabilitado en el candidato público. Las pruebas del componente inyectan ['es','en'] y verifican traducción de todas las ramas de portada/tutorial, cambio en curso con elección preservada y desmontaje de listeners. Eso no habilita el idioma en carrera o Daily, ni sustituye pruebas reales de determinismo del motor.

Pendiente antes de habilitar EN: traducir el modo carrera, formulario de creación, login/arranque, Daily UI y todas sus historias canónicas alcanzables, resultados/históricos, helpers de formato, mensajes de error/recuperación; probar paridad de snapshots y scores para mismos comandos; revisar layouts y Reddit real. No cambiar la lista de idiomas disponibles hasta superar esos gates.

No hay red de traducción ni dependencia de SDK analítico. El bundle contiene ambos catálogos; medir su coste real de empaquetado en CI y performance antes de certificar. Las pruebas actuales usan Node/DOM simulado, no dispositivo físico.

## Integración Daily
mountDaily recibe el adaptador compartido, fija lang en su raíz y limpia la suscripción al salir. Los textos estáticos UI y formatos de edad/rango usan claves; las fechas del ranking usan Intl con locale y UTC. daily-catalog.mjs añade tres claves y el total combinado pasa a 155. Estado pendiente read/write independiente del idioma. Ningún locale viaja en el POST ni modifica dailyId, choiceId, commandId o expectedRevision.

Ocho tests nuevos cubren las ramas UI y cambios de idioma durante solicitudes: 48/48 tests locales de la integración PASS. Los tests de decisión y deportes verifican explícitamente que los textos dinámicos siguen intactos: no representan una traducción completa. dailyRunView carece de eventId y el historial no guarda IDs de evento/elección; historias, consecuencias, etapas, honores, formatos deportivos y códigos de error requieren cobertura adicional. AvailableLocales sigue siendo [es].

## Escenas de reserva y metadatos públicos
daily-presentation.mjs agrega eventId/stageId solo a la respuesta pública; los runs persistidos y el historial antiguo siguen sin esos campos. daily-story-locale.mjs traduce por ID las 24 fallbackEvents, 72 opciones mostradas y seis stages. En ES devuelve el mismo objeto narrativo. En EN una clave ausente lanza MissingDailyTranslation; Daily muestra un aviso accesible sin elecciones para esa historia, y cambiar a ES restituye la escena sin pedir datos ni guardar.

157 claves UI en total; los JSON originales permanecen intactos. 54 pruebas locales PASS y una nueva prueba de integración de proyección para CI. Pendientes: catálogo canónico original elegible, resultados y consecuencias por ID, historial antiguo/nuevo, títulos, formatos/fases deportivas, carrera, creación y arranque. Ninguna de estas coberturas se presupone ni habilita English de producción.

## Inventario y compatibilidad del historial: revisión vigente
El catálogo final tiene 388 originales y la política Daily actual deja cero elegibles (388/110/9/2/2/0/0 por filtros); los originales de carrera no se han cambiado. Se incorpora la misma política como módulo para usarla tanto en runtime como en auditoría CI. La ausencia de originales elegibles es un hallazgo, no una nueva restricción del modo.

run.state.history ya contenía los IDs narrativos: se proyectan sin migrar ni escribir saves. publicDailyHistory valida cadencia, conteos, edades y orden fallback antes de añadir metadatos a cada entrada pública. Último resultado e historial se traducen por eventId/choiceId/outcomeId, incluidos runs anteriores compatibles; un registro ambiguo no recibe IDs inventados.

Deportes: 27 nombres ficticios de divisiones por divisionId; cuatro honores por honourId; formato continental, ocho grupos y cuatro fases por IDs públicos; clubStatus para jugador sin equipo. Una capa explícita convierte enums legacy de honores/fases a IDs sin alterar simulación, RNG o estado persistido. Equipos, nombres propios, cifras y fechas ISO no se traducen como texto arbitrario.

Pruebas: 64 locales de UI/proyección PASS, 12 de Daily con el motor original auditado PASS y 3 comprobaciones repetidas tras deporte PASS. Los imports TS se adaptaron únicamente en copia temporal para ejecutar el motor en Node 24; CI compilará el código por su ruta oficial. Permanecen 158 claves UI más catálogos narrativos/deportivos. EN de producción sigue bloqueado hasta cubrir carrera/creación/arranque, errores semánticos y validación final visual/determinista/Reddit.

## Creación, interfaz común y arranque
career-entry-catalog.mjs aporta 47 claves ES/EN: total 205 UI. web/game-ui.js recibe presentationLocale opcional, sin importar módulos Reddit; los fallbacks ES mantienen la entrada original. En Reddit se inyecta el mismo adaptador por cuenta. El formulario y su confirmación mantienen campos y salida bloqueada durante sustitución; cambiar locale no cierra el diálogo ni repite read/create/commit. Los estados internos read/write no dependen de etiquetas traducidas.

Avisos boot/login/retry se localizan por separado antes de init, con una preferencia de arranque distinta de save y de la clave por cuenta. Leer preferencias no escribe. Sin storage se mantiene el arranque en memoria. Disponibilidad EN de cuenta y arranque continúa bloqueada en producción.

74 pruebas locales PASS, incluida paridad de argumentos seed/nombre/backup y una sola confirmación ante doble activación. UI compartida default ES mantiene el microcopy contractual; nueva CI debe comprobar sus contratos. El contenido de Home/Carrera/Mundo/Relaciones/Perfil/Tu partida y narrativas/cinemáticas no se considera traducido por localizar la cabecera. Los errores desconocidos usan fallback EN recuperable, con texto original en ES; faltan códigos semánticos. QA visual y motor del candidato completo siguen pendientes.

## Tu partida y recuperación
career-save-catalog.mjs añade 37 claves ES/EN (242 UI combinadas). Traduce controles/ayuda de copias, importación, backup, legacy y eliminación; no cambia operaciones del almacén. Los parámetros de confirmación se vuelven a calcular con el formatter activo al cambiar idioma, conservando diálogo/candidato/backup. Mensajes fijos conocidos de revisión/conflicto/conexión tienen traducción explícita; no se deduce idioma de datos de carrera ni se traducen errores arbitrarios del servidor. Importaciones desconocidas usan consejo EN genérico; los códigos semánticos completos permanecen pendientes.

Ocho pruebas nuevas de recuperación PASS con DOM simulado, incluidas cancelación sin escritura, bloqueo durante confirmación, snapshot/backup idénticos, cambio de idioma sin relectura, conflicto y archivos inválidos. verify:reddit pasa build/config y 117 pruebas. EN de producción sigue bloqueado hasta cobertura completa y QA final.

## Inicio, simulación y controles deportivos
76 claves en career-home-catalog.mjs: 318 UI en total. Posiciones se presentan por enum; Inicio compacto usa claves para identidad, métricas, CTA y Daily. Render y actualización ligera comparten fecha/progreso localizados. No se modifica PlayerView, comandos, RNG ni datos de calendario.

El diálogo deportivo conserva tab y objeto deportivo al cambiar locale. Sus controles/tablas/avisos están traducidos; división, formato y fases dinámicas siguen originales y requieren proyección de IDs en un próximo bloque. Textos de decisión/resultado/oferta, paneles Carrera/Mundo/Relaciones/Perfil, acciones de jugador y parte de Home no compacto permanecen pendientes. English de producción sigue deshabilitado.

Diez pruebas runtime nuevas PASS; 127 tests Reddit con build oficial PASS; 53 checks combinados y 28 contratos UI posteriores al ajuste CSS PASS. QA local con fixture ES/EN en seis tamaños, sin escrituras ni evidencia de Redis/webview. Foco preservado en controles identificados; listener del diálogo se descarta al navegar.

## Deporte de carrera y paneles
El deporte de carrera presenta divisionId y metadatos de copa por IDs a través de shared/sports-presentation.mjs. Daily conserva las mismas exportaciones desde su módulo servidor. presentCareerSports devuelve ES intacto y una copia EN; no edita scores/tablas/nombres/penaltis/winners ni invalida la proyección cacheada. IDs desconocidos producen MISSING_CAREER_SPORTS_TRANSLATION y el diálogo ofrece recuperación cambiando a Español; no bloquea la carrera completa.

career-panels-catalog.mjs agrega 32 claves; con aviso deportivo se alcanzan 351 UI. Perfil incluye contrato y borrador de nombre por sessionId, con foco y texto conservados; identity se envía solo al guardar. Mundo/Relaciones traducen estructura y estados vacíos; noticias públicas y roles siguen originales. No se certifica su cobertura narrativa ni se habilita English.

Doce tests nuevos, build/config y 139 pruebas Reddit PASS, más 28 contratos de interfaz finales PASS; QA local de Perfil a 390×844 sin guardado ni datos de cuenta. Quedan Carrera, acciones voluntarias, narrativas/news/roles/cinematics y gates finales de equivalencia, accesibilidad y Reddit.
