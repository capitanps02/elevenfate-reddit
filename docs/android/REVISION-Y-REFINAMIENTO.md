> Informe histórico de refinamiento. La APK vigente es versionCode 3; resultados y valoración actualizados en [PRUEBAS-DURAS-Y-PUBLICACION.md](PRUEBAS-DURAS-Y-PUBLICACION.md). Los hashes y pruebas pendientes de este informe corresponden al build anterior.

# Revisión y refinamiento de ELEVENFATE Android

Build **20261001.a44624d00ce9** · aplicación 0.9.0 · versionCode 2 · 1 de octubre de 2026.

El informe describe correctamente la arquitectura y localiza dos optimizaciones importantes. No demuestra errores de funcionamiento en el motor. Se han aplicado mejoras al empaquetado, al arranque y a la legibilidad, conservando la compatibilidad de partidas y las cinemáticas activas. Esta entrega continúa siendo de pruebas; no se ha publicado ni pagado Google Play Console.

## Resultados medidos

Las cifras son bytes de archivos y APK, expresadas en MB decimales. No son medidas de RAM ni tiempos de arranque.

| Recurso | Antes | Ahora | Resultado |
| --- | ---: | ---: | --- |
| local.js | 9.20 MB | 51.9 KB | 99.44% menos JavaScript en este archivo |
| Recursos offline, sin manifiesto | 65.30 MB | 59.16 MB | Menos imágenes duplicadas y vídeos obsoletos |
| Vídeos empaquetados | 33 | 30 | Conservados todos los clips activos |
| APK DEBUG | 66.45 MB | 60.95 MB | 5.50 MB menos |
| APK QA | 59.86 MB | 56.01 MB | 3.85 MB menos |

El recorrido estático de arranque contiene **174 módulos y 1.93 MB de JavaScript**. Los tres registros históricos ya quedan fuera de ese recorrido. Sus archivos siguen dentro de la aplicación para recuperar partidas antiguas. La extracción de imágenes conserva exactamente sus bytes: no se ha bajado su resolución o calidad. La mejora del parser es verificable por tamaño; queda pendiente medir RAM y arranque en condiciones controladas antes de atribuirles un porcentaje de mejora.

## Respuesta a los 22 puntos del informe

| Punto | Diagnóstico | Acción / estado |
| --- | --- | --- |
| 1. Arquitectura | WebView y motor offline apropiados para este juego. | Conservada. |
| 2. Integridad | Confirmados 388 eventos, 210 seeds, 20 NPC, 20 familias, 528 clubes, 27 divisiones y 17 países. | Validador: 0 errores y 0 avisos. Base futbolística: 0 incidencias. |
| 3. Cinemáticas | Confirmadas tres versiones antiguas sin uso en el mapa activo. | Se empaquetan automáticamente solo los 30 archivos referenciados. Se conservan los originales en el repositorio. |
| 4. local.js | Optimización de prioridad alta justificada. | Ocho imágenes extraídas a archivos locales con nombres SHA-256. Dedupe por contenido. CSP permite imágenes del origen local. |
| 5. Legacy registry | Optimización de prioridad alta justificada; hay partidas migradas con procedencia histórica. | Motor de migración separado de registros. Carga dinámica tanto para catálogo antiguo como para decisiones históricas bajo un encabezado actual. Herramientas de migración conservan su API síncrona. |
| 6. Tamaño APK | No es por sí mismo un fallo. | Reducción medida arriba, conservando calidad visual. QA usa R8 y reducción de recursos. |
| 7. MUIR | La interfaz y sus adaptaciones siguen presentes. | Conservadas; revisión de pantallas documentada en evidencias. |
| 8. Fuentes pequeñas | Algunas ayudas y estados funcionales tenían 10–11 px. | Ayudas de forma/fatiga, contactos, estados de acciones/simulación y guardado aumentados a 12 px y mayor interlineado. Textos decorativos no cambiados en bloque. |
| 9. Seguridad WebView | CSP y origen local limitan el juego a recursos offline. | connect-src sigue en none; img-src self solo permite los nuevos archivos locales además de data. |
| 10. Puente Android | No se encontraron ejecutores genéricos, lectura arbitraria de archivos o apertura arbitraria de URL. | Conservado. Diagnóstico de anuncios condicionado por BuildConfig; producción lo desactiva. Política de privacidad solo desde URL configurada. |
| 11. Anuncios | El informe analiza una APK debug; sus IDs de prueba son correctos. | Debug/QA usan IDs de prueba. Release tiene IDs separados y comprobaciones de privacidad y firma. No se cambian a IDs comerciales para estas pruebas. |
| 12. Paquete | Sufijos debug/qa intencionados. | Release ya utiliza com.elevenfate.game. |
| 13. Versionado | Faltaba una identificación visible del artefacto. | Build visible en Tu partida; build-info.json incluye versiones, fecha, commit, árbol modificado y huella de fuentes/recursos. versionCode incrementado a 2. |
| 14. Runtime verified | false no indica un fallo. | Se mantiene false en el manifiesto. Las pruebas parciales se acreditan en informes independientes por SHA-256 del APK. |
| 15. Persistencia | Guardado y recuperación requieren evidencia sobre actualización real. | Añadida prueba automatizada de carrera de varios años, cierre forzado y actualización sin borrar datos. Resultado en runtime-upgrade.json. |
| 16. Referencias | La cifra aumenta al separar módulos y añadir metadatos. | 463 referencias comprobadas; 0 módulos ausentes. Manifiesto verifica tamaño y hash de recursos; imágenes y mapa de vídeos tienen pruebas específicas. |
| 17. Simulaciones | Un timeout de una carrera larga no prueba un bug. | Nueva batería reanudable de 1–1.000 carreras; checkpoint por seed, plazo por carrera y separación entre ejecución incompleta y error. No se da por completada la campaña de 1.000. |
| 18. Visual Android | La inspección del CSS no certifica todas las pantallas/dispositivos. | Las pruebas funcionales del APK en API 36 pasan. Mediciones DOM a 360/412/800 px muestran imágenes locales decodificadas y ausencia de desborde horizontal. Certificación visual pendiente: capturas cubiertas por avisos de System UI y errores de UiTestAutomationBridge, también tras reiniciar. No se certifican tres dispositivos. |
| 19. No reescribir | Cambiar estos sistemas sin un fallo observado sería una ampliación injustificada. | No se ha reconstruido el gameplay, la base futbolística, IndexedDB o el sistema de eventos. |
| 20. Orden de trabajo | Prioridad correcta: optimización y pruebas antes de producción. | Primera fase implementada; publicación sigue después de completar consentimiento, anuncios y certificación. |
| 21. Puntuaciones | Las notas son una valoración del auditor, no un indicador medido. | Se sustituyen como criterio de avance por pruebas, tamaños y hashes del binario. |
| 22. Conclusión | Base adecuada para continuar las pruebas. | APK optimizada entregada con evidencia; sigue pendiente la certificación de producción. |

## Validación y límites

- 149 pruebas de partidas, compatibilidad y migraciones pasaron. Las ocho pruebas finales de paquete y optimización también pasaron, incluida una migración real desde el catálogo anterior sin importación previa del registro.
- Cuatro pruebas de equivalencia PlayCanvas, incluida la migración diferida de una partida histórica. Diez simulaciones de 365 días con semillas distintas y validación de estado, números finitos y contratos; checkpoints recuperados en una segunda ejecución. No equivalen a diez carreras completas.
- Cinco pruebas unitarias de política publicitaria. Lint Android: 0 errores, 1 aviso informativo sobre versión de herramientas. Corregidas las dos cadenas Android sin recursos de traducción.
- Los APK DEBUG y QA se comprueban por hash en runtime-debug.json y runtime-qa.json. Ver build-validation.json para el alcance y resultado de esta ejecución.
- La revisión visual **no está aprobada**. Se observaron diálogos de sistema y fallos de UiTestAutomationBridge. Las capturas bloqueadas se conservan en evidence/ con esa etiqueta; no se presentan como capturas válidas del producto. No apareció en el registro examinado un ANR con el nombre del paquete ELEVENFATE, pero eso no sustituye una certificación visual.
- runtime-upgrade.json registra los hashes antiguo y nuevo, comandos del motor hasta los 21 años, restauración exacta del guardado, actualización con install -r y nueva restauración. Su campo passed es el resultado, no una certificación de todo Android.
- El AAB QA también se genera, pero no se ha instalado desde splits de un AAB ni se ha certificado para Google Play.
- No se acreditan todavía impresiones reales de anuncios, formularios UMP completos, importación/exportación mediante el selector Android, reproducción de cada uno de los 30 vídeos, gesto físico atrás, Android antiguo ni rendimiento de un móvil físico.

## Cómo probar esta entrega

Abre ABRIR-ELEVENFATE-EMULADOR.command desde Finder o Terminal. Instala la APK QA y conserva los datos de la misma aplicación. Los paquetes debug y QA tienen almacenes separados. Si el emulador muestra avisos de System UI, esa sesión no sirve para certificar la presentación; el fallo del banco queda registrado en runtime-visual.json. El identificador exacto aparece en Tu partida.

La política publicitaria sigue siendo la ya acordada: 8 minutos activos iniciales, 6 resultados, 8 minutos entre anuncios y máximo 2 por sesión; los grupos protegidos reciben formato contextual con cierre inmediato. Estos ajustes no se han cambiado durante esta revisión.

## Campaña larga de QA

Desde el repositorio y usando Node:

```sh
npm run build
npm run qa:android:careers -- 1000 3210000
```

La carpeta qa/android-careers/<sourceIdentity> conserva cada carrera completada. Repetir el comando recupera los checkpoints del mismo motor. Si se cambia el motor se usa otra identidad. Cada proceso tiene un plazo de cinco minutos; una carrera que lo supere se registra como incompleta y requiere diagnóstico, sin etiquetarla automáticamente como fallo del juego.

Esta batería usa el simulador existente y valida cada estado final, comprueba valores numéricos finitos, edad, contrato y ofertas tras retirada. Registra edad y cierre. Para una muestra corta se puede usar --days=365; su informe deja fullCareer en false. La campaña extensa y las verificaciones adicionales de invariantes del informe deben completarse antes de la release; no se certifican por ejecutar una muestra corta. También sigue disponible qa:1000 para la comprobación histórica de cobertura de contenido.

## Archivos de evidencia

- docs/android/package-audit.json: recuentos, referencias, tamaño y recorrido inicial.
- docs/android/runtime-debug.json y runtime-qa.json: pruebas offline sobre cada APK.
- docs/android/runtime-upgrade.json: conservación de la carrera al actualizar.
- docs/android/runtime-visual.json: mediciones DOM y motivo por el que la certificación visual está pendiente.
- docs/android/build-validation.json y outputs/SHA256SUMS.txt: artefactos y huellas.
- docs/android/evidence/: logs y resultados de esta revisión.
