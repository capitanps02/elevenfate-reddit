# ELEVENFATE — pruebas duras y valoración para Google Play

Fecha: 1 de octubre de 2026. App 0.9.0, **versionCode 3**, build **20261001.ac65785d5156**. Esta revisión sustituye las valoraciones de pruebas pendientes de los informes anteriores. Código y artefactos locales; cambios todavía sin enviar a GitHub.

## Dictamen

**Preparado para continuar las pruebas locales en emulador. Todavía no preparado para subir un AAB de producción ni para publicar en Google Play.** La APK QA actual pasa los recorridos documentados, pero utiliza `com.elevenfate.game.qa` y un certificado Android de depuración. El AAB `ELEVENFATE-QA-no-publicar.aab` es exclusivamente de pruebas.

Se ha encontrado y corregido un fallo real de exportación tras pérdida del proceso. No quedan fallos funcionales pendientes en los casos ejecutados. Esto acredita esos casos y ese entorno; no certifica todos los móviles, todas las trayectorias narrativas ni la aprobación de Google Play.

## Pruebas y resultados

| Prueba | Resultado y alcance |
| --- | --- |
| Motor, sesión y persistencia | **736 casos distintos aprobados**. Incluyen doble pulsación, comandos repetidos, fallos de persistencia, rollback, importaciones inválidas, migraciones históricas, decisiones/resultados pendientes y conservación del RNG. |
| Interrupciones de decisiones | 100 ciclos con cuatro puntos de interrupción y recuperación; estado y RNG se conservan. |
| Guardado y recuperación | 100 ciclos JSON de sesión; además, una carrera interactiva completa del motor hasta el retiro. |
| Carreras completas adicionales | **3/3** semillas diferentes, hasta el retiro a los 38, 39 y 41 años. Sin bloqueo ni violación de las invariantes comprobadas. Son simulaciones del motor, no tres carreras completas jugadas en pantalla Android. |
| Carrera dentro de APK QA con R8 | **PASS**, desde los 18 hasta los 21 años mediante comandos reales de GameSession, decisiones, resultados y ofertas. Guardado recuperado tras cerrar el proceso y girar. |
| Actualización QA v2 → v3 | Instalación conservando datos; cinco repeticiones de recuperación tras force-stop y rotación: **5/5**. |
| Exportación/importación nativa | Selector Android real, copia de 14.240 bytes idéntica al guardado, importación con confirmación y cancelación sin modificar la partida: **PASS**. |
| Exportación con proceso eliminado | Copia real de 14.240 bytes y transferencia sintética de **2.111.489 bytes**, ambas conservadas: **PASS**. La transferencia grande comprueba el transporte, no es una partida válida para importar. |
| Pantalla y navegación | **PASS** en un único AVD con tres tamaños CSS: 360×752, 412×867 y 800×1232. Sin desbordamiento horizontal en las vistas medidas, imágenes decodificadas, build visible y tecla Atrás Android real. Capturas inspeccionadas. |
| Vídeos offline | Los 30 clips activos decodifican y comienzan la reproducción en WebView Android. Ensayo realizado sobre v2; comparación ZIP acredita que esos bytes y el motor permanecen idénticos en v3. No se certifica reproducción completa ni sonido. |
| Anuncios | **5/5** pruebas de política. Instrumentación QA verifica habilitación y tratamiento CHILD real del SDK para edad protegida. Falta certificar impresión, cierre/retorno y formulario UMP con anuncios de prueba. |
| Compilación y Lint | APK debug, APK QA, AAB QA y tests Gradle correctos. Lint: cero errores y un aviso informativo sobre versión de Gradle. |
| Paquete offline | **8/8** casos finales. 445 recursos verificados por APK, referencias resueltas y recursos coincidentes con el manifiesto. Sin bibliotecas `.so` dentro de los APK actuales. |

La primera ejecución de la batería amplia terminó con siete fallos por informes de auditoría generados que faltaban; su controlador también registró timeout del proceso. Se generaron las dependencias y se repitieron los cinco archivos afectados: **52/52** aprobados. Los 736 casos son el conjunto de títulos aprobados sin duplicados entre ejecuciones; no se presenta la primera orden como una ejecución limpia.

El emulador sufrió inicialmente ANR de System UI y servicios de Google, y una sonda de carrera agotó su espera. Tras recuperar el entorno, la misma lógica de juego pasó las pruebas finales. Los registros finales de recuperación QA no contienen ANR ni excepción Java de ELEVENFATE. El reloj del Mac avanzó durante parte de la batería; las duraciones recogidas no sirven como benchmark de rendimiento.

## Fallo corregido

**Antes:** al solicitar «Descargar copia», Android abría su selector de destino. Si el sistema terminaba ELEVENFATE antes de pulsar Guardar, el contenido pendiente se perdía y se creaba un JSON vacío. La partida interna seguía intacta, pero la copia externa era inútil. Reproducción: se esperaban 14.240 bytes y se obtenían cero.

**Ahora:** se guarda primero una copia privada en la caché de la app, se conserva únicamente su nombre al recrear la actividad y se copia al destino fuera del hilo de interfaz. El mensaje de éxito aparece después de cerrar correctamente el archivo; cancelación y error se gestionan y se limpia la copia temporal. Se evita meter varios megabytes de JSON en el estado de Android. La prueba reproduce la eliminación del proceso con el selector abierto y confirma el contenido final byte por byte, también por encima de 2 MB.

Cambios: `MainActivity.java`, mensajes en `strings.xml`, versionCode 3, generador de build-info sincronizado con Gradle y script reproducible `scripts/test-android-export.mjs`. La corrección no cambia el motor, las decisiones ni los vídeos. Solo cambia metadata entre los recursos web de las APK v2 y v3.

## Qué falta para Google Play, en orden

1. **Completar la cuenta de Play Console:** pago y verificaciones que indique la cuenta. El último estado comunicado es que no se ha pagado; no se ha inspeccionado el portal. Si es una cuenta personal nueva, Google requiere verificar acceso a un Android físico sin root, Android 10 o posterior: el emulador no sirve para esa verificación. Puede ser un teléfono prestado. [Requisito oficial de dispositivo](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en).
2. **Política de privacidad pública HTTPS:** redactar la política con los datos del responsable, datos del SDK y derechos/contacto; publicarla y enlazarla desde la app y la ficha. `privacyPolicyUrl` está vacío. El texto debe reflejar el funcionamiento real de AdMob/UMP; anuncios no personalizados no significa ausencia de recogida de datos. [Privacidad en Google Play](https://support.google.com/googleplay/android-developer/answer/18258653?hl=en-GB_ie&rd=2), [datos del SDK de anuncios](https://developers.google.com/admob/android/privacy/play-data-disclosure).
3. **Preparar el paquete comercial:** confirmar el applicationId definitivo, crear y guardar de forma segura la clave de subida, configurar Play App Signing y construir un AAB `release` firmado. Actualmente faltan las propiedades de firma. Mantener bloqueada la compilación comercial hasta completar privacidad y revisión de público; no marcar la revisión como hecha sin realizarla. [Firma de aplicaciones](https://developer.android.com/studio/publish/app-signing).
4. **Completar ficha y declaraciones:** título, descripción, icono, capturas actuales, contacto, países, anuncios, público objetivo, cuestionario IARC, Data Safety y revisión Families según el público real. «Para todos» no determina automáticamente una clasificación de contenido. Los menores/edad desconocida tienen tratamiento protegido en código, pero falta validar contenido y declaraciones. [Preparación de la revisión](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en), [Families](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en), [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en-GB).
5. **Validar monetización con anuncios de prueba:** configurar el mensaje UMP y probar aceptar/rechazar/reabrir privacidad, interrupción y retorno al juego, intersticial y banner protegido, falta de red y falta de anuncio. No hay impresiones reales certificadas. El ritmo actual sigue siendo 8 minutos activos iniciales, 6 resultados, 8 minutos activos entre intersticiales y máximo 2 por sesión de actividad; banner protegido cerrable inmediatamente y máximo 20 segundos. [Anuncios de prueba](https://support.google.com/admob/answer/9388275?hl=en-GB).
6. **Beta de Play y dispositivos adicionales:** subir el AAB comercial al canal de pruebas adecuado, revisar el informe previo al lanzamiento y probar en móviles ARM y versiones Android inferiores. Para cuentas personales creadas después del 13 de noviembre de 2023, se exige prueba cerrada con al menos **12 participantes inscritos durante 14 días continuos** antes de solicitar acceso a producción; completar la prueba no equivale a aprobación automática. [Prueba cerrada](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [informe previo al lanzamiento](https://support.google.com/googleplay/android-developer/answer/9844487?hl=en).
7. **Activar ingresos tras los requisitos de AdMob:** enlazar la app con una tienda compatible y completar la revisión de preparación que muestre AdMob, incluida verificación de app-ads.txt cuando corresponda. Esta revisión regula el servicio de anuncios y no sustituye los requisitos de publicación en Play. [Preparación de apps en AdMob](https://support.google.com/admob/answer/10564477?hl=en-GB).

El target SDK 36 actual cumple el nivel requerido para nuevas apps desde el 31 de agosto de 2026. Esto satisface ese requisito concreto; no desbloquea los demás. [Requisito de API de Google Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

## Límites de esta valoración

Un AVD API36 x86_64, renderizado por software; los tres tamaños de pantalla no son tres dispositivos. No hay prueba física, Android24–35, ARM, GPU de fabricantes, TalkBack completo, audio y reproducción íntegra de cinemáticas, ni recuperación de partida interrumpida por una impresión de anuncio real. La carrera larga dentro de APK llega a los 21; el retiro se prueba en el motor. Esas coberturas deben ampliarse antes de un lanzamiento público.

La APK QA sirve para seguir jugando desde el lanzador del Mac y conserva los guardados al actualizar. El APK debug solo es para diagnósticos. No subir ninguno de los artefactos QA/debug a producción.

## Artefactos exactos y evidencia

- **ELEVENFATE-debug.apk**: 60,953,755 bytes; SHA-256 `9fd19c2482de3148d2506201d62b2cc0f4977afa02fe8e000ab1185660dcd30f`.
- **ELEVENFATE-QA.apk**: 56,016,446 bytes; SHA-256 `cfa494da58ee373263a85048a159a2c92b4290456f46aeb36d60b7f89ec2118d`.
- **ELEVENFATE-QA-no-publicar.aab**: 58,057,676 bytes; SHA-256 `789fa080778747868914e12d4db66a3c29e1d63a8063616540ef23f24d623b36`.

Los hashes están también en `outputs/SHA256SUMS`. Resumen estructurado: `outputs/PRUEBAS-DURAS-RESULTADOS.json`. Evidencia por prueba: `docs/android/hard-tests/`; metadata vigente: `docs/android/build-validation.json`. Los antiguos `runtime-*.json` fuera de `hard-tests/` corresponden a builds anteriores. Las capturas entregadas con sufijos small/large/tablet/build-info corresponden al debug v3.
