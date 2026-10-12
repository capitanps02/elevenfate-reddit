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
