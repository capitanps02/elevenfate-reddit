# Localización de portada y tutorial — integración inicial

Origen reutilizado: PR #3, feat/english-localization-seed-20261011, SHA 74d60cf0224bcd59b06f03f98176741006905406. es.json/en.json conservan los bytes originales; no se fusiona el resto de la PR ni se afirma que el juego esté traducido.

presentation-locale.mjs combina sus 99 claves UI con 53 claves de cover-catalog.mjs. La fuente ES de la escena tutorial se deriva de tutorial-sample.mjs; English usa los mismos eventId/choiceId y resultados como ejemplos. Se localiza al presentar, sin editar el catálogo narrativo canónico.

El adaptador permite getLocale, isAvailable, setLocale, subscribe y t(key, params). Claves/parametros ausentes fallan explícitamente; nunca se muestran IDs como texto. La preferencia usa una clave separada por cuenta/instalación y no cambia schema, revisiones, semillas, puntuaciones, contenido ni rankings. Storage bloqueado permite continuar en memoria; valores corruptos no bloquean el juego. La creación del adaptador no escribe preferencias.

La entrada game.mjs fija availableLocales=['es']. English sigue deshabilitado en el candidato público. Las pruebas del componente inyectan ['es','en'] y verifican traducción de todas las ramas de portada/tutorial, cambio en curso con elección preservada y desmontaje de listeners. Eso no habilita el idioma en carrera o Daily, ni sustituye pruebas reales de determinismo del motor.

Pendiente antes de habilitar EN: traducir el modo carrera, formulario de creación, login/arranque, Daily UI y todas sus historias canónicas alcanzables, resultados/históricos, helpers de formato, mensajes de error/recuperación; probar paridad de snapshots y scores para mismos comandos; revisar layouts y Reddit real. No cambiar la lista de idiomas disponibles hasta superar esos gates.

No hay red de traducción ni dependencia de SDK analítico. El bundle contiene ambos catálogos; medir su coste real de empaquetado en CI y performance antes de certificar. Las pruebas actuales usan Node/DOM simulado, no dispositivo físico.
