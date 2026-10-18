# C3 - Preparación de publicación de la nueva interfaz

18 de octubre de 2026. Nueva interfaz: 56 vistas implementadas e integradas al 100 % en la rama local. Plan global: **95 %; 5/6 pasadas cerradas, una pasada pendiente**.

La versión pública instalada sigue siendo 0.1.8. Esta preparación no solicita su publicación ni cambia la instalación pública. Candidata **0.1.8.1**, instalada y comprobada en r/elevenfate_dev2; certificado RELEASE-C3.json.

Compilación normal: `EF-C3-c79a8987e58ab7c4`. Fingerprint: `af255f7571563f681985aa75def7ebaa7e146ba1163c4326e499ec2edc4c19b2`.

Validación completada: 335/335 pruebas Reddit/UI y 177/177 de sesiones, guardados y carrera completa; 388 eventos y 4241 textos traducidos, sin ausencias; 56 vistas en inglés y 24 adaptaciones adicionales; 224 comprobaciones españolas de C2 reutilizadas porque sus 63 archivos de presentación no cambian.

La compilación normal conserva exactamente los 27 archivos de ejecución comparables de C2: cliente, estilos, fuentes, imágenes y servidor. Los HTML solo cambian su etiqueta de compilación. Por eso el informe visual C2 sigue siendo la referencia visual aprobada. El manifiesto público release.json sella los bytes que se subirán.

Controles añadidos: rechazo de builds con --locale-preview, archivos compilados alterados, identificadores mezclados y archivos de QA en producción. El catálogo y sus partidas sintéticas quedan fuera del paquete de Reddit. La CI ejecuta este control antes de aceptar una candidata.

Comprobado en Reddit privado: portada, carrera, perfil, exportación, ayuda, español/inglés, entrada Daily, reglas y clasificación; presentación Mobile y Desktop del navegador. La exportación de carrera conserva exactamente sus bytes tras instalar la actualización. No se inicia un intento competitivo ni se avanza la carrera.

Pendiente: T17, revisión en móvil físico, teclado y ampliación de texto en dispositivo. No se afirma una validación física a partir de tamaños de navegador. Las 56 vistas completas usan datos deterministas en el catálogo local; en Reddit se comprueban los recorridos accesibles con la partida conservada y la identidad exacta del mismo bundle.

## Preparar y verificar

`pnpm run prepare:reddit`

`node scripts/check-reddit-production.mjs --candidate`

El certificado redditPlaytest está actualizado para la huella comprobada en Reddit privado. Cualquier cambio posterior de implementación invalida la certificación automáticamente.

## Entrega y aceptación

La candidata incluye código, compilación normal, referencia PDF, plan ponderado, pruebas y un manifiesto SHA-256. Ejecutar `python3 verificar.py` en la carpeta descomprimida. Interfaz: 100 % creada e integrada. Preparación global: 95 %. La publicación pública y la aceptación física no se presentan como realizadas.

## Publicación posterior

La subida privada y la publicación son operaciones distintas. Para el lanzamiento se debe publicar la fuente revisada mediante el flujo de Devvit y registrar la versión exacta que devuelve la CLI. No se debe reinstalar una versión pública diferente sin comprobar antes sus evidencias ni borrar Redis. La candidata privada no se instala cargando un ZIP.

## Reversión

La versión pública de referencia es elevenfate@0.1.8. Si una actualización posterior presenta una regresión, reinstalar esa versión sin borrar datos. Reinstalar no deshace el progreso del jugador.
