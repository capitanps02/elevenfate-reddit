# ELEVENFATE: plan de ingeniería para Android, AdMob y Google Play

Fecha: 1 de octubre de 2026. Objetivo: una aplicación Android instalable que conserve el juego actual, monetice con anuncios y se publique en Google Play tras superar las pruebas y revisiones. Este documento separa la primera implementación, la validación y los pasos de lanzamiento: un APK compilado por sí solo no acredita que la app esté lista para producción.

## 1. Punto de partida comprobado

- Repositorio: [capitanps02/Juego-Multihistoria](https://github.com/capitanps02/Juego-Multihistoria).
- `main` remoto consultado: `36d3d1b0750b0ded877e55953f223e2de1169a46`, del 28 de septiembre. La base local de interfaz P12 tiene commit `68ed393` y contiene ese `main` en su historial, más mejoras posteriores y cambios locales a ELEVENFATE. La copia de trabajo conserva esas mejoras; no se sustituye por un `main` anterior.
- La integración PlayCanvas de la escena `2593315` monta la interfaz web y `GameSession` mediante el script generado. Por eso Android puede empaquetar los mismos módulos y cinemáticas directamente. No es necesario reescribir la simulación en Java/Kotlin. Si se incorporan escenas 3D dependientes de PlayCanvas, habrá que incluir también el export del motor y sus assets.
- Ya existían WebViewAssetLoader, IndexedDB, importación/exportación de partidas y algunas sondas Android. La base anterior apuntaba a API 35 y no incluía anuncios.
- Android Studio y un SDK están instalados. Su JBR es Java 25, incompatible con Gradle 8.13; para esta base se ha preparado un JDK 17 local al espacio de trabajo. La instalación del usuario no se sustituye.
- AdMob tiene la cuenta creada. Play Console no está pagado/activado; el usuario ha indicado que primero quiere probar el juego con las capas Android. No se hace ningún pago ni publicación en esta fase. Inicialmente AdMob no tenía la app ni los bloques.
- Público deseado: amplio, principalmente adolescente y adulto. La política actual habilita publicidad para todas las edades, con banner protegido para menores de16/desconocidos; la selección final de público en la tienda exige revisar el contenido.

## 2. Arquitectura elegida y límites

```text
Código TypeScript + interfaz web + cinemáticas
                 │ compilación y manifiesto SHA-256
                 ▼
Assets dentro del APK/AAB ──► WebViewAssetLoader HTTPS local
                                     │
                                     ├── GameSession + IndexedDB + exportación/importación
                                     └── puente Android pequeño
                                                │
                                  grupo de edad → UMP → AdMob nativo
```

El juego funciona offline, incluyendo sus vídeos. La app tiene permiso de Internet para anuncios y UMP, pero el WebView del juego sigue bloqueando red externa y mantiene `connect-src 'none'`. No se cargará el juego desde `launch.playcanvas.com` al arrancar: una caída de PlayCanvas o la falta de conexión no impiden jugar.

La identidad Android provisional de distribución es `com.elevenfate.game`; `debug` y `qa` añaden sufijos para convivir con producción. Se debe confirmar antes del primer AAB en Play: el identificador de una app publicada no se cambia. La clave IndexedDB existente permanece compatible, pero las partidas del navegador/PlayCanvas no aparecen automáticamente en Android: se trasladan con exportar/importar JSON.

Se usa Google Mobile Ads **25.5.0 (`com.google.android.gms:play-services-ads`)**, UMP **4.0.0**, AGP **8.13.2**, Gradle **8.13**, JDK **17**, `minSdk 24` y `compileSdk/targetSdk 36`. Son versiones fijadas para esta implementación, no una orden de instalar siempre la última. La [guía de AdMob](https://developers.google.com/admob/android/quick-start) documenta inicialización en segundo plano y configuración; la [compatibilidad AGP 8.13](https://developer.android.com/build/releases/agp-8-13-0-release-notes) establece Gradle 8.13 y JDK 17. Se comprobará la cadena exacta en cada actualización.

Para una app nueva, Google Play requiere desde el 31 de agosto de 2026 Android 16/API 36 o superior. Fuente: [requisito oficial de API](https://support.google.com/googleplay/android-developer/answer/11926878).

## 3. Criterios generales de aceptación

1. Se inicia, juega y guarda una carrera sin red; cerrar/reabrir el proceso recupera el último estado confirmado.
2. La nueva interfaz, nombre ELEVENFATE, decisiones, ofertas y cinemáticas coinciden funcionalmente con la versión de origen.
3. Ningún fallo de anuncio, ausencia de inventario o error de consentimiento bloquea la carrera.
4. Se habilitan solicitudes para todas las edades, condicionadas por UMP. Menores de16/desconocidos reciben tratamiento CHILD y un banner cerrable inmediatamente;16–17 reciben TEEN. Todas las solicitudes son contextuales (`npa=1`) y contenido máximo G.
5. Los intersticiales aparecen únicamente en transiciones explícitas después de resultados guardados: nunca sobre una elección pendiente, una cinemática, importación, arranque o salida.
6. Volver atrás, cambiar orientación, segundo plano, interrupciones y navegación por gestos funcionan en teléfono y pantalla grande.
7. Las compilaciones de desarrollo usan IDs de prueba. Producción exige IDs reales, privacidad HTTPS, revisión de público y clave de subida.
8. Un AAB de producción debe estar firmado, validado en Play y haber superado QA. La variante QA, aunque optimizada, no se publica.
9. Se conserva evidencia con versión, hash del binario, dispositivo, WebView y resultado. Las sondas antiguas no certifican este APK.

## 4. Tareas y dependencias

**Responsables:** Ingeniería = trabajo automatizable de código/pruebas; Titular = propietario de las cuentas, datos legales, decisiones de negocio y dispositivos; Ambos = revisión conjunta. **Estados:** implementado no significa validado en dispositivo; pendiente significa trabajo de la siguiente fase. Los resultados concretos de esta sesión se registran en `ESTADO-IMPLEMENTACION.md`.

### M0 — Baseline reproducible y entorno

| ID | Tarea específica | Responsable | Dependencia | Evidencia para cerrar |
|---|---|---|---|---|
| E01 | Identificar GitHub, `main`, rama de interfaz y cambios locales | Ingeniería | Ninguna | SHA remoto y procedencia de snapshot |
| E02 | Copiar la última versión conservando nombre, interfaz y cinemáticas | Ingeniería | E01 | Copia independiente y comparación de fuentes |
| E03 | Crear rama local de portabilidad y mantener remoto de GitHub | Ingeniería | E02 | `codex/elevenfate-android-admob` |
| E04 | Fijar matriz JDK/Gradle/AGP/SDK y verificar descargas | Ingeniería | E02 | Wrapper con checksum y build reproducible |
| E05 | Configurar SDK 36 y JDK 17 para este Mac | Ingeniería | E04 | Gradle sincroniza y compila |
| E06 | Confirmar `applicationId`, versión inicial y estrategia de incrementos | Ambos | E02 | Identidad aprobada antes de subir el primer AAB |
| E07 | Registrar licencias de imágenes, vídeos, audio, fuentes y nombres de clubes | Ambos | E02 | Inventario de derechos, atribuciones y sustituciones necesarias |
| E08 | Consolidar cambios locales y Android en un commit revisable | Ingeniería | M1/M2 | Diff separado de los cambios anteriores; ninguna credencial |

**Estimación:** 0,5–1 día de ingeniería; E07 depende de las licencias disponibles.

### M1 — Aplicación Android que conserva el juego

| ID | Tarea específica | Responsable | Dependencia | Evidencia para cerrar |
|---|---|---|---|---|
| A01 | Regenerar TypeScript y assets offline desde las fuentes | Ingeniería | E04 | Manifiesto con archivos y SHA-256 |
| A02 | Empaquetar todas las cinemáticas y comprobar referencias | Ingeniería | A01 | Ningún vídeo faltante; reproducción sin red |
| A03 | Mantener HTTPS local, CSP y bloqueo de navegación externa | Ingeniería | A01 | Prueba de carga local y rechazo de origen externo |
| A04 | Encapsular red de AdMob/UMP fuera del WebView del juego | Ingeniería | A03 | Juego offline y anuncios nativos con red |
| A05 | Mantener guardado IndexedDB y migración histórica | Ingeniería | A01 | Tests de guardado; prueba en proceso real |
| A06 | Verificar exportación/importación con selector Android y copias de recuperación | Ingeniería | A05 | JSON válido, cancelación segura y reapertura |
| A07 | Conectar pausa/reanudación con actividad, anuncios, pérdida de foco y audio | Ingeniería | A01/M2 | No avanza simulación ni audio durante interrupciones |
| A08 | Adaptar insets, recortes, navegación por gestos y edge-to-edge de Android 16 | Ingeniería | E05 | Capturas con controles utilizables en cuatro tamaños |
| A09 | Soportar rotación/tablets sin destruir el WebView innecesariamente | Ingeniería | A08 | Rotación repetida sin perder posición/partida |
| A10 | Comprobar atrás en pantallas, decisiones, diálogos y salida | Ingeniería | A07 | Recorrido documentado; sin cierres inesperados |
| A11 | Crear icono vectorial/adaptativo E y nombre del launcher | Ingeniería | E02 | Nombre ELEVENFATE e icono verificados |
| A12 | Crear variantes debug, QA optimizada y release | Ingeniería | E04 | APK debug y QA; AAB QA; build release protegido |
| A13 | Reducir recursos/bytecode con R8 preservando el puente JS | Ingeniería | A12 | Variante QA abre y los métodos JS siguen funcionando |
| A14 | Adaptar scripts de compilación y README a wrapper e IDs nuevos | Ingeniería | A12 | Comandos locales documentados y ejecutables |
| A15 | Revisar errores WebView, carga, renderizador caído y guardado fallido | Ingeniería | A05 | Mensajes recuperables; ningún spinner infinito |
| A16 | Revisar tamaño de APK/AAB y necesidad de Play Asset Delivery | Ingeniería | A02/A12 | Tamaño medido; decisión según assets reales |

**Estimación:** 1–3 días incluyendo dispositivos; existe base previa, por lo que parte de estas tareas ya está implementada.

### M2 — AdMob, consentimiento y monetización

| ID | Tarea específica | Responsable | Dependencia | Evidencia para cerrar |
|---|---|---|---|---|
| M01 | Crear ELEVENFATE Android como app no publicada en AdMob | Ingeniería/Titular | Cuenta AdMob | App ID real registrado |
| M02 | Crear bloque intersticial con nombre estable | Ingeniería | M01 | ID real de unidad |
| M03 | Crear bloque recompensado reservado para futura mecánica | Ingeniería | M01 | ID real; uso inicial solo de prueba |
| M04 | Integrar el SDK admitido para Families y UMP, con IDs de prueba en debug/QA | Ingeniería | A12 | Compila y carga anuncios oficiales de prueba |
| M05 | Mostrar selección neutral de grupo de edad, con opción desconocida | Ingeniería | Público definido | Elección local; sin fecha de nacimiento ni envío al juego |
| M06 | Aplicar tratamiento CHILD y banner cerrable para menores de16/desconocidos | Ingeniería | M05 | Verificación en arranque y tras cambiar grupo |
| M07 | Crear/publicar mensajes de privacidad en AdMob para EEE/Reino Unido/Suiza | Ambos | M01 y URL política | UMP presenta formulario cuando corresponda |
| M08 | Consultar consentimiento en cada inicio y antes de mostrar/solicitar | Ingeniería | M04/M07 | Aceptar, rechazar, volver a abrir y error de red verificados |
| M09 | Añadir acceso a opciones de anuncios cuando UMP lo requiera | Ingeniería | M08 | Control visible e interactuable en Tu partida |
| M10 | Definir intersticial tras resultado guardado y vuelta a carrera | Ingeniería | A05 | Evento emitido solo tras comando exitoso y transición segura |
| M11 | Aplicar límites iniciales: 8 min activos hasta el primero;6 resultados;8 min activos entre anuncios;máximo2 por sesión de actividad | Ingeniería | M10 | Tests de política y pruebas en dispositivo |
| M12 | Manejar no-fill, error de carga, expiración, doble toque y callbacks tardíos | Ingeniería | M04 | Se continúa jugando; no aparece un anuncio retrasado sobre otra pantalla |
| M13 | Pausar simulación/audio antes del anuncio y reanudar al cerrarlo | Ingeniería | A07/M10 | Interrupción y retorno verificados |
| M14 | Verificar vídeo recompensado voluntario en QA con callback real de recompensa | Ingeniería | M03/M04 | Cerrar antes no otorga nada; recompensa solo tras callback |
| M15 | Diseñar recompensa comercial con valor y texto claro: propuesta cosmética o contenido adicional | Ambos | M14 | Decisión de producto; no cambiar azar ni resolver elecciones pendientes |
| M16 | Añadir comando de recompensa al motor con ID único y registro persistente | Ingeniería | M15 | Reintentos y cierre del proceso no duplican beneficio |
| M17 | Usar verificación de servidor si la recompensa afecta saldo económico o economía compartida | Ingeniería | M15 | Diseño y pruebas SSV, si aplica |
| M18 | Mantener configuración real fuera de debug/QA y secretos fuera de Git | Ingeniería | M01/M02 | release.properties local y plantilla vacía |
| M19 | Bloquear release sin IDs reales, política, firma y revisión de público | Ingeniería | M18 | Build negativo falla por la causa esperada |
| M20 | Vincular app de AdMob a su ficha Play y completar verificación/revisión | Ambos | Publicación de ficha | Estado apto para servir anuncios |
| M21 | Preparar dominio de desarrollador y `app-ads.txt` con registro exacto de la cuenta | Ambos | Dominio del titular/M01 | Archivo accesible y verificado por AdMob |
| M22 | Comprobar aprobaciones, identidad, perfil de pagos y método de cobro | Titular | Cuenta AdMob | Estado completo sin compartir datos bancarios en código/chat |
| M23 | Medir impresiones, ingresos estimados y retención antes de ajustar frecuencia | Ambos | Beta con usuarios | Informe por país y sesión; cambios basados en datos |

La selección de edad y UMP son controles distintos: UMP determina cuándo pueden solicitarse anuncios; el control de edad evita publicidad en el grupo protegido. El vídeo de QA **no concede beneficios a la carrera**: la persistencia de una recompensa comercial se implementará en M15–M17.

Los [intersticiales oficiales](https://developers.google.com/admob/android/next-gen/interstitial/single-load) se deben situar en transiciones naturales; los [recompensados](https://developers.google.com/admob/android/next-gen/rewarded/single-load) requieren gestionar el callback de recompensa. La [guía UMP](https://developers.google.com/admob/android/privacy) documenta actualización al iniciar, `canRequestAds()` y acceso a preferencias. Estas guías sustentan la integración, no garantizan inventario ni ingresos.

**Estimación:** 2–4 días para publicidad y consentimiento reales; 1–3 días adicionales si se introduce economía de recompensas. La primera integración usa intersticiales; no depende de terminar recompensas comerciales.

### M3 — QA y endurecimiento

| ID | Tarea específica | Responsable | Dependencia | Evidencia para cerrar |
|---|---|---|---|---|
| Q01 | Comparar ejecución fuente/empaquetada con mismas semillas y decisiones | Ingeniería | A01 | Estados, resultados y RNG equivalentes |
| Q02 | Recuperar IndexedDB después de detener proceso y actualizar APK | Ingeniería | A05 | Partida recuperada y revisión igual |
| Q03 | Reproducir carrera nueva, decisiones, resultado, ofertas y retiro | Ingeniería | A01 | Recorridos cortos y largos sin bloqueos |
| Q04 | Probar modo avión desde primer arranque y desde partida ya guardada | Ingeniería | A02 | Juego completo accesible; anuncios fallan de forma tolerante |
| Q05 | Probar importación inválida, archivo grande, cancelación y exportación fallida | Ingeniería | A06 | Partida original protegida y error comprensible |
| Q06 | Probar 360×800, 390×844, horizontal y tablet; fuentes grandes/TalkBack | Ingeniería | A08 | Sin overflow; objetivos táctiles/foco correctos |
| Q07 | Medir arranque frío/caliente, memoria y respuesta al simular | Ingeniería | A12 | Informe por dispositivo; objetivo provisional <3 s en gama media |
| Q08 | Validar teléfono físico de gama media y uno modesto | Titular/Ingeniería | A12 | Modelo, Android y WebView registrados |
| Q09 | Validar API 24/29/35/36 y última estable disponible | Ingeniería | A12 | Matriz de compatibilidad, con excepciones explícitas |
| Q10 | Probar anuncios con 16+, menor16 y desconocido | Ingeniería | M06/M08 | Todos los perfiles habilitados; menores/desconocidos usan banner y tratamiento CHILD |
| Q11 | Probar consentimiento requerido, rechazo y cambio posterior | Ingeniería | M07 | UMP real y comportamiento del SDK comprobados |
| Q12 | Probar no-fill, desconexión, anuncios expirados y segundo plano | Ingeniería | M12 | Sin crash; no bloquea ni altera partida |
| Q13 | Probar pausa de vídeo/audio y retorno del anuncio a la misma pantalla | Ingeniería | M13 | Resultado guardado antes y después igual |
| Q14 | Ejecutar pruebas de política, tests de juego, Lint y QA con R8 | Ingeniería | A13/M11 | Informes asociados al hash del binario |
| Q15 | Revisar bibliotecas nativas y compatibilidad con páginas de 16 KB | Ingeniería | A12 | Inspección de .so; alineación/prueba si existen |
| Q16 | Revisar manifiesto fusionado: permisos, SDKs y componentes exportados | Ingeniería | M04 | Solo permisos/componentes justificados |
| Q17 | Pre-launch report de Play Console y correcciones | Ingeniería | Beta interna | Sin incidencias bloqueantes |
| Q18 | Congelar candidato, regenerar hashes y documentar riesgos residuales | Ingeniería | Q01–Q17 | Registro de release y checklist firmada por titular |

Para apps nuevas/actualizaciones que apuntan a Android 15 o superior, la compatibilidad con páginas de memoria de 16 KB es un requisito de Play desde noviembre de 2025. Si no existen bibliotecas nativas propias o de dependencias, no se recompila WebView: lo proporciona Android. Si aparecen `.so`, hay que inspeccionarlas y probarlas. Fuentes: [guía de páginas](https://developer.android.com/guide/practices/page-sizes), [anuncio oficial](https://android-developers.googleblog.com/2025/05/prepare-play-apps-for-devices-with-16kb-page-size.html).

**Estimación:** 2–4 días; se solapa parcialmente con M1/M2.

### M4 — Preparar Google Play

| ID | Tarea específica | Responsable | Dependencia | Evidencia para cerrar |
|---|---|---|---|---|
| P01 | Completar alta/verificación de Play Console y dispositivo si se solicita | Titular | Cuenta Play | Cuenta habilitada, no solo formulario de alta |
| P02 | Crear borrador ELEVENFATE: idioma español, juego y modelo gratuito con anuncios | Ambos | P01 | App creada sin publicar |
| P03 | Confirmar paquete definitivo antes de la primera subida | Titular | E06 | Identidad registrada en checklist |
| P04 | Generar clave de subida, copia cifrada y recuperación; activar Play App Signing | Ambos | P03 | Alias, huella y backup bajo control del titular |
| P05 | Crear política de privacidad pública HTTPS, soporte y datos del titular | Ambos | Público/M07 | URL accesible; texto describe datos reales del juego/SDK |
| P06 | Cumplimentar Data Safety según manifiesto y SDK reales | Ambos | Q16/P05 | Declaración contrastada, incluidos datos de AdMob |
| P07 | Declarar anuncios, acceso a app y permisos como Advertising ID si aparecen | Ambos | Q16 | Formularios coherentes con el binario |
| P08 | Realizar cuestionario de clasificación IARC a partir del contenido completo | Titular/Ingeniería | E07/Q03 | Clasificación emitida, no edad inventada |
| P09 | Elegir grupos de edad y revisar Families si se incluyen niños | Ambos | M05/E07 | Audiencia real y controles adecuados |
| P10 | Redactar título, descripción breve/larga y notas de versión | Ingeniería/Titular | P08/P09 | Sin claims de funciones inexistentes |
| P11 | Crear icono de tienda 512×512, gráfico 1024×500 y capturas reales | Ingeniería | Q06 | Assets revisados de teléfono/tablet |
| P12 | Revisar idiomas, países, disponibilidad y precios | Titular | P10 | Mercados de salida confirmados |
| P13 | Compilar AAB release, validar firma y revisar SDK/API/versionCode | Ingeniería | Q18/P04–P09 | Candidato firmado con informe |
| P14 | Subir primero a prueba interna y verificar distribución desde Play | Ambos | P13 | Instalación por enlace de testing y prueba de actualización |
| P15 | Registrar tester list, escenarios y canal de recogida de fallos | Ambos | P14 | Lista y plan de pruebas; contacto solo con autorización |
| P16 | Iniciar prueba cerrada si la cuenta la exige | Ambos | P15 | Testers inscritos y uso real documentado |
| P17 | Solicitar acceso a producción tras cumplir el periodo exigido | Titular | P16 | Respuestas sobre pruebas, hallazgos y correcciones |
| P18 | Revisar avisos/políticas y resolver rechazos | Ambos | P17 | Sin bloqueos de consola |

Si la cuenta personal se creó después del 13 de noviembre de 2023, Play exige una prueba cerrada con **12 participantes inscritos durante al menos 14 días consecutivos** antes de solicitar acceso a producción. No basta con una prueba interna ni el paso del tiempo sin participación. La aprobación posterior puede requerir pruebas adicionales. Fuente: [requisitos de pruebas para cuentas personales](https://support.google.com/googleplay/android-developer/answer/14151465).

Si se incluyen niños en el público objetivo, la app debe cumplir [Families](https://support.google.com/googleplay/android-developer/answer/9893335). La versión actual sirve banner contextual protegido a menores16/desconocidos; contenido, enlaces, SDKs y declaraciones de tienda deben revisarse. No se declarará “para todas las edades” únicamente por intención comercial.

**Estimación:** 1–3 días para ficha, firma y formularios, más tiempos de verificación/revisión y, cuando aplique, un mínimo de 14 días de prueba cerrada.

### M5 — Lanzamiento y operación

| ID | Tarea específica | Responsable | Dependencia | Evidencia para cerrar |
|---|---|---|---|---|
| L01 | Revisar candidato concreto: hash, firma, ficha, política y audiencia | Ambos | P18 | Checklist de salida completada |
| L02 | Solicitar publicación de esa versión en los países elegidos | Titular/Ingeniería | L01 | Versión enviada a revisión |
| L03 | Lanzar con alcance limitado y ampliar si el canal lo permite | Ambos | Revisión aprobada | Distribución monitorizada |
| L04 | Revisar Android Vitals, crashes/ANR, valoraciones y errores de guardado | Ingeniería | L03 | No hay regresiones bloqueantes |
| L05 | Revisar estado AdMob, app-ads.txt, inventario e ingresos estimados | Ambos | M20–M22/L03 | Servicio real aprobado; no usar clics propios para probar |
| L06 | Corregir incidencias con versionCode superior y política de compatibilidad | Ingeniería | L04 | Actualización conserva partidas |
| L07 | Mantener runbook de soporte, reversión de publicación y recuperación | Ambos | L01 | Pasos claros para detener expansión y publicar arreglo |
| L08 | Revisar SDK/API/políticas antes de cada release | Ingeniería | Continuo | Nueva matriz de versiones y tests asociados |

## 5. Monetización propuesta

**Primera versión comercial:** intersticiales moderados tras resultados confirmados. Retraso inicial de8 minutos activos, al menos6 resultados elegibles,8 minutos activos entre anuncios y2 por sesión de actividad. Para menores de16/desconocidos se usa un banner con cierre inmediato, máximo20 segundos y renovación automática desactivada. El tiempo en segundo plano, consentimiento y pantalla completa no cuenta como juego activo. Son valores iniciales de diseño para proteger la experiencia; se ajustarán tras medir uso y retención. Si no hay anuncio listo, se omite esa oportunidad. Nunca se espera a una carga para poder seguir jugando.

**Segunda iteración:** anuncio recompensado optativo con beneficio definido y persistente. Preferir contenido adicional o cosmético que no rompa el equilibrio narrativo. Mostrar previamente el beneficio y concederlo solo una vez después del callback. El diagnóstico actual no modifica el juego.

**Otras posibilidades:** no se implementan banners ni anuncios al abrir en la primera iteración. Se evaluarían con datos de uso y espacio de pantalla. Los ingresos dependerán de usuarios activos, mercados, impresiones, inventario y eCPM; no se presupone una cantidad. Fórmula para escenarios: ingreso estimado diario = impresiones/1000 × eCPM. AdMob es el servicio para cobrar anuncios en la app; Google Ads sirve para comprar campañas de adquisición.

## 6. Riesgos concretos y mitigación

| Riesgo | Impacto | Acción |
|---|---|---|
| Instalar Android Studio pero no completar SDK/JDK compatibles | No compila/sincroniza | Wrapper fijado, SDK 36 y JDK17 local; guía de apertura |
| Usar evidencia Android anterior al APK actual | Falsa certificación | Hash y nueva ejecución de pruebas |
| Copiar `main` remoto y perder UI/branding recientes | Retroceso visual | Baseline P12 con cambios locales documentados |
| Confiar en red para cargar el juego | No se puede jugar sin conexión | Assets completos en APK y CSP local |
| R8 elimina métodos invocados desde JavaScript | Exportación/anuncios dejan de funcionar | Keep de @JavascriptInterface y prueba de QA minificada |
| Ads/consentimiento detienen una carrera | Pérdida de retención o estado | Guardar antes; anuncios opcionales al flujo y errores tolerantes |
| App incluye niños pero ficha/SDK no cumplen | Rechazo o limitación | Selección neutral, sin anuncios menores16/desconocidos y revisión Families |
| Derechos de clubes, marcas o multimedia sin acreditar | Rechazo/reclamación | Inventario E07 y reemplazos antes de ficha pública |
| AdMob no aprueba la app o faltan mensajes publicados | No sirve anuncios reales | M07/M20–M22 y prueba real previa al lanzamiento |
| Se pierde la clave de subida | Problemas de futuras versiones | Copia segura del titular y Play App Signing |
| Recompensa duplicada por callbacks/reinicio | Desequilibrio de economía | Comando único y registro persistente antes de producción |
| Cambiar applicationId después de subir | Nueva app/partidas separadas | Confirmar identidad antes del primer AAB |

## 7. Orden de ejecución y calendario orientativo

1. **Ahora:** cerrar baseline, compilar Android 36, integrar SDK/UMP, crear bloques AdMob y entregar APK de ensayo + plan. Compilar release permanece condicionado por su configuración real.
2. **Siguiente sesión:** abrir el proyecto en Android Studio, validar en emulador/teléfono, recopilar datos del titular/dominio y configurar mensajes UMP reales.
3. **Después:** cerrar QA, privacidad, audiencia/licencias y clave de subida; producir AAB de distribución interna.
4. **Prueba interna/cerrada:** corregir fallos con uso real; mantener 12 participantes/14 días si la cuenta lo exige.
5. **Producción:** revisar la versión concreta, enviar a Google y completar la revisión de AdMob.

Orientación, no promesa: **7–12 jornadas de ingeniería** para cerrar producto y QA, con parte adelantada por la base existente. El lanzamiento puede ocupar **3–5 semanas o más** al incluir la prueba cerrada, verificaciones y revisiones. Si se necesita modificar contenido/licencias o incorporar recompensa comercial, se revisa la estimación. La duración real se decide por criterios de aceptación, no por el número de APKs generados.

## 8. Datos que debe aportar o completar el titular

- Confirmar el paquete `com.elevenfate.game` antes de subir por primera vez.
- Completar el alta/verificación de Play Console, si todavía queda algún paso de pago o identidad.
- Datos de desarrollador y correo público de soporte; no hace falta pegar contraseñas ni datos bancarios en el chat.
- Dominio/URL pública para privacidad y `app-ads.txt`, y derechos de los assets.
- Teléfono(s) Android para QA y participantes reales para la prueba cerrada si aplica.
- Decidir audiencia final a partir del contenido y cuestionario de clasificación.
- Guardar la clave de subida y su copia segura; revisar la ficha y el candidato antes del lanzamiento.

## 9. Qué significa el primer entregable

El primer APK permite empezar pruebas. AdMob puede quedar registrado con IDs reales, pero debug y QA continúan usando **anuncios de prueba**. Un AAB QA optimizado demuestra que el empaquetado y R8 compilan; su firma es de pruebas y no es el archivo para publicar. La app no estará en Google Play hasta completar M3/M4/M5 y el estado de revisión correspondiente.

Actualización solicitada por el titular el1 de octubre: toda edad puede recibir publicidad con su protección correspondiente. Se cambió Next-Gen por el SDK incluido en la [lista Families](https://support.google.com/googleplay/android-developer/answer/12955712). El banner no contiene vídeo, no se renueva automáticamente y no se superpone a controles del juego. La comprobación real de anuncios/consentimiento sigue siendo una tarea de QA antes de publicar.
