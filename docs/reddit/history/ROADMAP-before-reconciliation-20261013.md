> Registro histórico. Sustituido por ../ROADMAP.md el 13-Oct-2026. No contiene la cola vigente.

# ElevenFate Reddit — rumbo único y tareas de entrega

Fecha: 13 de octubre de 2026. Autoridad de ejecución: `docs/reddit/ROADMAP.md` en `capitanps02/elevenfate-reddit`.
Este plan sustituye el orden y los porcentajes de los planes anteriores; sus contratos funcionales y evidencias se conservan como referencia. No reinicia proyectos ya realizados.

## Objetivo inmediato
Entregar la portada y el tutorial existentes con continuidad de partida fiable, conservando el juego y el trabajo previo de inglés. Una sola candidata de portada: PR #4, rama `feat/reddit-cover-entry-20261012`, pendiente de sincronizar con la entrega subida. No abrir otro rediseño ni otra implementación de idioma. La corrección de guardado queda preparada en esa candidata; su integración final requiere el código de 0.1.7.

## Versión real e inglés: comprobación del 13-Oct
El usuario tenía razón: existe un resultado independiente con el botón y traducción funcional. No es trabajo pendiente de traducción.

| Superficie | Versión/estado observado | Evidencia |
|---|---|---|
| Reddit Developers, App Versions | 0.1.7, Public, Approved, subida el 12-Oct, cero instalaciones | Portal autenticado leído el 13-Oct |
| Comunidad pública r/ElevenFate | 0.1.6 instalada | Post oficial abierto y carrera inspeccionada |
| Comunidad de pruebas r/elevenfate_dev2 | 0.1.6.7, Private Playtest, una instalación | Portal y post de prueba |
| Inglés ya implementado | Switch to English cambia splash; Play abre la carrera inglesa | Botón, títulos, navegación, indicadores, fechas y acceso Daily en inglés observados sin avanzar carrera |
| GitHub accesible | Base 91b6449; portada c369949; seed 74d60cf | Cinco ramas y cuatro PR inspeccionados; no acreditan el source de 0.1.7 |

El runtime observado demuestra que hay traducción operativa. No es una auditoría de todos los relatos, pero no justifica rehacerlos. La instrucción vigente es conservar y reutilizar el resultado completo del usuario.

U0 cambia a **sincronizar la fuente de la entrega 0.1.7**, incluido idioma, Daily, guardado y SDK, con GitHub y la candidata de portada. El problema encontrado es divergencia entre código accesible y entrega subida, no ausencia de inglés. Los catálogos iniciales de PR #3 coinciden por hash con los ya reutilizados en PR #4; no vuelven a integrarse. PR #3 se conserva hasta conciliar la fuente completa.

Bloqueo concreto: no se ha localizado el directorio fuente, archivo o commit que produjo 0.1.6.7/0.1.7. Los archivos accesibles de GitHub no corresponden a esa entrega y los informes disponibles no incluyen su fuente actual. Se necesitan esos archivos para implementar y publicar portada/guardado sin perder funcionalidades. No sustituir la versión aprobada por una build de la base antigua.

Referencias verificadas: portal https://developers.reddit.com/apps/elevenfate/app-versions y post de pruebas https://www.reddit.com/r/elevenfate_dev2/comments/1wwq9n4/elevenfate_tu_carrera_tus_decisiones_tu_legado/ . La comunidad de pruebas es privada. No se cambió ninguna instalación ni se avanzó ninguna carrera.

## Inventario consolidado

| Frente | Evidencia actual | Decisión |
|---|---|---|
| Portada y navegación | PR #4 abierta en borrador, base c369949; controles y retornos implementados | Cerrar revisión visual y experiencia real; no rehacer estructura |
| Tutorial | Tres pasos interactivos, escena verificada y ejemplos, salida voluntaria; pruebas existentes | Reutilizar; comprobar salida, comprensión y ausencia de escrituras |
| Inglés independiente | Verificado funcional en 0.1.6.7; 0.1.7 aprobada; fuente de entrega aún no sincronizada | U0: sincronizar source de la entrega, cero retraducción |
| Guardado | Informe 10-Oct; save-store de la candidata aún carecía de reconciliación y timeout | U1: corrección implementada en esta entrega, pendiente de certificación/publicación |
| Telemetría | PR #2, 23f2f341, módulos apagados y 91 pruebas históricas; sin hooks productivos | Congelar expansión. Reutilizar después de estabilizar la candidata |
| Puntuación Daily | PR #1, 7c49d720; fórmula v2 preparada, sin integración | Comparar primero con 0.1.7: puede haber trabajo posterior ya hecho; no reintegrar por leer una PR antigua |
| Marketing/comunidad | Registro actualizado 11-Oct: 28 posts externos en 27 comunidades y cinco retiradas históricas | Medir lo existente antes de ampliar volumen; una entrada jugable |
| Featuring/ficha promocional | Contexto histórico: ficha enviada 9-Oct; estado actual no acreditado | Consultar expediente existente; no enviar solicitud duplicada |
| Gold | Contexto histórico de cuenta verificada; no prueba de producto integrado/aprobado | Separar alta, producto y aprobación. Verificar expediente antes de implementar o reenviar |
| QA y publicación | 0.1.7 aprobada sin instalar; pública en 0.1.6; pruebas en 0.1.6.7 | Vincular fuente de 0.1.7 y preservación de partidas antes de integrar/publicar cambios |
| Android/PlayCanvas/MUIR original | Proyectos distintos de esta adaptación | Fuera del alcance de esta entrega Reddit; no repetir su certificación completa |

Los conteos de marketing son históricos, no observaciones actuales. La consulta de correo para trámites no pudo realizarse porque esa conexión no está disponible; no se concluye que falte una respuesta.

## Cola única de trabajo

| ID | Tarea concreta | Criterio de cierre | Estado |
|---|---|---|---|
| U0 | Recuperar el código que produjo 0.1.7 y sincronizar candidata/GitHub | Fuente exacta de entrega identificada; diferencias de idioma, Daily, guardado y SDK conciliadas | BLOQUEO de integración: fuente de 0.1.7 no accesible; inglés verificado |
| U1 | Reconciliar guardados inciertos sin repetir comandos | Respuesta perdida confirmada por lectura; fallo previo permite un único reenvío idéntico; conflictos y errores permanentes no se reintentan | Código y pruebas focalizadas PASS |
| U2 | Verificar portada/tutorial ya implementados | Continuar conserva estado; Nueva confirma sustitución; Daily vuelve al origen; tutorial no escribe; controles accesibles en webview corta | Pendiente de revisión final |
| U3 | Identificar candidata publicable sin regresiones | CI del SHA final, comparación con versión instalada, idiomas preservados y guardado real al cerrar/reabrir | Pendiente |
| U4 | Entregar en Reddit mediante el flujo existente | Versión exacta instalada/aprobada y comprobación pública; conservar la versión anterior como reversión | Pendiente; no confundir PR con publicación |
| U5 | Evaluar captación existente y fricciones | Tabla por post con fecha, destino, retiradas, respuestas humanas y ventanas comparables; separar vistas de jugadores | Tras U4; reutilizar registro |
| U6 | Conectar diagnóstico mínimo solo si aporta evidencia necesaria | Reutilizar PR #2; comprobar aislamiento, cuotas, apagado y coste del hook de guardado | Diferido |
| U7 | Revisar expedientes de featuring y Gold | Estado y referencia verificables de cada trámite; siguiente acción única | Espera externa/verificación |
| U8 | Retomar puntuación Daily v2 | No alterar partidas antiguas; fecha futura explícita y comparación de resultados; release independiente | Diferido |

Orden de desarrollo: U1 → U2 → U3 → U4. U0 es requisito de integración para U1/U2: ambos trabajos se conservan, pero no se publican sobre una base anterior a la entrega aprobada. No es una misión de traducción nueva. U7 no bloquea la experiencia de juego.

## Implementación de U1
- Se conserva el snapshot serializado y la generación de partida de la operación original.
- Ante red, timeout, JSON incompleto o un error HTTP temporal, se consulta la partida actual.
- Si coincide exactamente con el candidato, se confirma sin volver a ejecutar ni reenviar la decisión.
- Si no cambió el estado previo, se permite un único reenvío con los mismos bytes y expectedGeneration.
- Si otra escritura cambió la partida, se detiene y mantiene la recuperación existente.
- Tiempo máximo por intento: 8 s, incluyendo lectura del cuerpo. Como máximo PUT/GET/PUT/GET (32 s más 200–399 ms de espera), excluyendo validación local y lectura inicial cuando aún no hay estado cargado.
- Timeout no implica fracaso demostrado; respuestas tardías no actualizan el estado confirmado.
- No se repiten automáticamente importaciones, restauraciones de copia ni eliminaciones.
- Sin cambios de esquema, motor, puntuación, RNG, almacenamiento del servidor o catálogos de idiomas.
- Se conserva el indicador actual «Guardando…» durante el proceso; se evita abrir otra tarea de interfaz o localización.

Validación local: 20/20 pruebas de guardado (12 nuevas y 8 existentes), incluyendo una sesión real del motor y equivalencia exacta de snapshots. 28/28 contratos UI. Bundles de código cliente/servidor compilados. La suite Reddit completa se lanzó pero no produjo un resumen final verificable en este entorno: no se cuenta como PASS. El empaquetado completo no se completó localmente por ausencia de assets originales; lo debe validar la CI del commit. Sin prueba de Redis remoto, dispositivo físico ni publicación.

## Reglas para evitar duplicidades
1. Antes de tocar un frente, leer esta cola, la versión instalada/subida y el HEAD actual de su PR. Cada tarea tiene un único resultado y una sola candidata.
2. Trabajo en curso: un cambio funcional activo. No mezclar puntuación, telemetría y portada en la misma entrega.
3. PR #3 conserva su historial y se mantiene hasta aclarar la entrega independiente; sus catálogos ya reutilizados no generan tareas nuevas.
4. Los documentos COVER-PROGRESS, COVER-LOCALIZATION y los planes anteriores son evidencia y contratos de referencia. Sus «siguientes pasos» y porcentajes históricos no son la cola vigente.
5. No volver a comparar diseños ya elegidos, generar nuevos assets, ampliar tutorial, cambiar framework, refactorizar motor o crear dashboards sin un defecto/necesidad demostrado.
6. Pruebas proporcionales al cambio: regresión afectada y un pase final de la candidata; no repetir auditorías completas por cada texto o actualización documental.
7. Marketing: reutilizar registro de URLs, descartar destinos retirados/prohibidos y conciliar duplicados; no aumentar publicaciones para inflar una cifra.
8. Featuring y Gold: buscar solicitud existente antes de crear otra. No enviar comunicaciones nuevas con este trabajo de consolidación.
9. No calcular progreso global mezclando diseño, código, traducción y publicación. Informar tareas cerradas, evidencia y pendientes. El antiguo 76% queda como dato histórico del alcance ampliado.

## Único registro de entrega
Al cerrar U3/U4 registrar: commit, CI y pruebas, versión Devvit, comunidad/post, idiomas realmente ofrecidos, resultado de reanudación y Daily, incidencias abiertas y versión de reversión. Hasta entonces, estado correcto: candidata en desarrollo; no publicada.

Fuentes: planes de portada v12, telemetría v1.9, marketing v7 e informe de guardado 10-Oct; PR #1–#4 y las cinco ramas existentes consultadas el 13-Oct. La comprobación en vivo confirma el resultado de inglés indicado por el usuario; falta sincronizar su fuente, no recrear la traducción.

