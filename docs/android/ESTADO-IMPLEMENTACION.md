# ELEVENFATE Android: estado de implementación

Actualizado el 1 de octubre de 2026. Prioridad inicial: jugar y validar en emulador. Estado actual: continuar hacia la primera subida interna con la cuenta Play Console ya creada. No hay teléfono Android disponible para pruebas físicas. El AVD se ha probado sin ventana; la apertura de ventana desde el entorno automatizado quedó bloqueada por los servicios gráficos de macOS. Se entrega un lanzador para ejecutarlo desde Finder/Terminal.

## Código y configuración entregados

- Copia del repositorio con las mejoras locales de ELEVENFATE conservadas, en la rama local `codex/elevenfate-android-admob`. No se ha enviado esta rama a GitHub.
- APK offline con 445 recursos empaquetados (aproximadamente 59,2 MB sin comprimir), interfaz, GameSession, vídeos y guardado IndexedDB.
- Android compile/target36, min24, JDK17, AGP8.13.2 y wrapper Gradle8.13 con checksum. App ID provisional `com.elevenfate.game` y variantes `.debug`/`.qa`. Debe decidirse el ID definitivo antes de publicar.
- Insets de barras/cutout, Atrás con dispatcher Android, señalización de pausa/reanudación, selector nativo de archivos y origen HTTPS local seguro. Depuración WebView solo en debug.
- AdMob nativo `play-services-ads:25.5.0` y UMP4.0.0; el juego sigue bloqueando red externa. Grupo de edad neutral: menos de16/16–17/18+/prefiero no indicar. Todos habilitados; menores de16/desconocidos usan tratamiento CHILD y banner protegido, los demás tratamiento TEEN/UNSPECIFIED. Todos reciben solicitudes no personalizadas y filtro G.
- Intersticial únicamente tras confirmar un resultado y volver a carrera: primero tras8min activos y6 resultados; separación8min activos, máximo2 por sesión de actividad. Sin anuncio preparado se sigue jugando. El reloj del juego no determina estos límites.
- Diagnóstico con IDs de prueba en debug/QA, y vídeo recompensado solo de diagnóstico: no modifica la economía ni la partida. Producción no incluye ese diagnóstico.
- Banner protegido cerrable inmediatamente, máximo20s; unidad real sin vídeo ni renovación automática.
- App y tres bloques reales registrados en AdMob, documentados en `ADMOB.md`. La existencia de los IDs no acredita aprobación ni ingresos.
- Release exige privacidad HTTPS, revisión de público/Families y firma de producción. La comprobación de esa configuración incompleta bloquea el build comercial.

## Preparación de Play Console: AAB interno v4

Se ha preparado `playtest` con `com.elevenfate.game`, versionCode4, firma de subida nueva y solicitudes de anuncios apagadas solo en esta variante. Bundletool valida el AAB, genera splits y pasan elección guardada, recuperaciones y reinstalación. La variante comercial `release` sigue bloqueada por privacidad/revisión de público; la firma local ya está configurada, pero Play App Signing no.

La sesión de Play Console fue comprobada de nuevo el 1 de octubre de 2026: cuenta personal creada, pero «Crear aplicación» bloqueado hasta verificar identidad, acceso a un Android físico y teléfono de contacto. No hay subida realizada; evidencia en `publication/play-console-access.json`. Plan de66casos, artefactos, ficha y borradores en `publication/RUTA-HASTA-GOOGLE-PLAY.md` y `outputs/PLAY-CONSOLE/`. Los APK debug/QA entregados fuera de esa carpeta siguen siendo v3 y sus informes por hash permanecen válidos.

## Validación QA/debug entregada: versionCode 3

Build `20261001.ac65785d5156`. APK debug y QA probados por sus SHA-256 actuales; AAB QA compilado, firmado con clave de depuración y no publicable.

- 736 casos funcionales distintos aprobados tras generar los informes de auditoría requeridos y repetir los archivos afectados; primera orden de la batería no terminó limpia.
- Tres carreras del motor completas hasta retiro (38/39/41), y carrera dentro de APK QA de 18 a 21 años.
- Actualización QA v2→v3 conserva partida; cinco recuperaciones tras force-stop y rotación, más recuperación de la carrera de 21 años.
- Exportación/importación/cancelación SAF real aprobadas. Corregida exportación vacía tras muerte del proceso; comprobados 14.240 bytes de partida y transferencia sintética de 2.111.489 bytes.
- Visuales aprobados en un AVD con tres tamaños; tecla Atrás Android real y build visible.
- Gradle y Lint correctos: cero errores, un aviso. Política de anuncios 5/5, paquete offline y refinamientos 8/8, 445 recursos verificados por APK.

La referencia completa es [PRUEBAS-DURAS-Y-PUBLICACION.md](PRUEBAS-DURAS-Y-PUBLICACION.md), con evidencia en `hard-tests/` y resumen actual en `build-validation.json`. Los informes `runtime-*.json` fuera de esa carpeta son históricos y tienen hashes de builds anteriores.

## Trabajo pendiente

La QA local pasa dentro del alcance documentado. No se ha verificado una impresión de anuncio ni el flujo completo UMP. No hay móvil físico ni cobertura ARM/Android24–35; no se certifica el sonido ni la reproducción completa de cinemáticas. El emulador tuvo incidencias de System UI/Google, recuperadas antes de las pruebas finales; los tiempos no son benchmarks.

No está lista para publicar: faltan privacidad HTTPS, firma/AAB comercial, completar la cuenta y declaraciones de Play, revisión de público y beta. Los requisitos de 12 participantes/14 días y verificación con Android físico dependen de si es una cuenta personal nueva. El estado de Console se ha inspeccionado: cuenta personal creada y verificaciones pendientes; no se ha inspeccionado el historial de pagos. AdMob requiere aparte la revisión de preparación para servir anuncios plenamente.

El lanzador de `outputs/` sigue permitiendo probar la QA sin pagar ni publicar y conserva el AVD original y sus guardados. No se ha enviado código a GitHub ni publicado ninguna app.

## Actualización 2 de octubre de 2026

El AAB v5 está subido, procesado y guardado como borrador de prueba interna. Google muestra 0 errores y 1 advertencia: no hay testers. El titular confirma que todavía no dispone de testers; no se ha añadido nadie ni activado la versión. Paquete com.elevenfate.game, versión 5 (0.9.0-internal), min24/target36, descarga indicada 55,5 MB. Play App Signing activo y certificado de subida coincidente. Política HTTPS guardada en Console. No equivale a aprobación de políticas ni producción.

Las afirmaciones anteriores sobre verificaciones, ausencia de web y falta de subida son históricas. Política: https://capitanps02.github.io/Juego-Multihistoria/privacidad/. La prueba nativa sobre splits del AAB exacto confirma decisión/guardado, tres recuperaciones, rotación, reinstalación y siete controles Android, incluido el Intent real de privacidad. Release comercial requiere sus propias pruebas y revisión de público/Families/UMP.

## Identidad visual v6 y ficha de tienda

La v6 local integra portada de Inicio, emblema de cabecera y launcher Android adaptativo/monocromo. Compilación/Lint/unit/offline aprobadas; AAB exacto validado (447 recursos) y cuatro fases nativas de guardado/recuperación/rotación/reinstalación aprobadas en API36. Primer intento de runtime rechazado por System UI queda registrado. La ficha española tiene textos/icono definitivo/banner guardados; categoría Deportes y correo público guardados. No se ha subido v6 ni enviado ficha a revisión. Ver `outputs/PLAY-CONSOLE/brand-implementation.json` para capturas y estado de la entrega.

### Capturas promocionales — 2 octubre 2026

Cuatro pantallas reales de una carrera de demostración del AAB v6 estilizadas con image_gen y revisadas: El balón parado, Titular aquí/promesa allí, temporadas y relaciones. Guardadas en el borrador español de Play Console a1080×1920. Fuentes, prompts, hashes y captura nativa en `design/store-screenshots-2026-10-02/`. Se modifica únicamente material de tienda y el runner de captura AndroidTest; AAB conserva el mismo hash.
