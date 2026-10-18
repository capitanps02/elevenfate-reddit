# C3 - Preparación de publicación de la nueva interfaz

18 de octubre de 2026. Nueva interfaz: 56 vistas implementadas e integradas al 100 % en la rama local. Plan global: 85 % mientras se cierra la validación de destino.

La versión pública instalada sigue siendo 0.1.8. Esta preparación no solicita su publicación ni cambia la instalación pública. La candidata privada se registrará en RELEASE-C3.json después de subirla y comprobarla.

Compilación normal: `EF-C3-c79a8987e58ab7c4`. Fingerprint: `af255f7571563f681985aa75def7ebaa7e146ba1163c4326e499ec2edc4c19b2`.

Validación completada: 335/335 pruebas Reddit/UI y 177/177 de sesiones, guardados y carrera completa; 388 eventos y 4241 textos traducidos, sin ausencias; 56 vistas en inglés y 24 adaptaciones adicionales; 224 comprobaciones españolas de C2 reutilizadas porque sus 63 archivos de presentación no cambian.

La compilación normal conserva exactamente los 27 archivos de ejecución comparables de C2: cliente, estilos, fuentes, imágenes y servidor. Los HTML solo cambian su etiqueta de compilación. Por eso el informe visual C2 sigue siendo la referencia visual aprobada. El manifiesto público release.json sella los bytes que se subirán.

Controles añadidos: rechazo de builds con --locale-preview, archivos compilados alterados, identificadores mezclados y archivos de QA en producción. El catálogo y sus partidas sintéticas quedan fuera del paquete de Reddit. La CI ejecuta este control antes de aceptar una candidata.

Pendiente en esta fase: instalar una versión privada, comprobar portada/carrera/Daily/ayuda/exportación con la partida privada intacta, cerrar la candidata y realizar la revisión en dispositivo físico. No se afirma una validación física a partir de tamaños de navegador.

## Preparar y verificar

`pnpm run prepare:reddit`

`node scripts/check-reddit-production.mjs --candidate`

Tras la comprobación en Reddit privado, el certificado redditPlaytest puede actualizarse para esa misma huella. Cualquier cambio posterior de implementación invalida la certificación automáticamente.

## Publicación posterior

La subida privada y la publicación son operaciones distintas. Para el lanzamiento se debe publicar la fuente revisada mediante el flujo de Devvit y registrar la versión exacta que devuelve la CLI. No se debe reinstalar una versión pública diferente sin comprobar antes sus evidencias ni borrar Redis. La candidata privada no se instala cargando un ZIP.

## Reversión

La versión pública de referencia es elevenfate@0.1.8. Si una actualización posterior presenta una regresión, reinstalar esa versión sin borrar datos. Reinstalar no deshace el progreso del jugador.
