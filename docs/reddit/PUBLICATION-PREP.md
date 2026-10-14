# Candidata de portada preparada para publicación

14 de octubre de 2026 · **96 % de preparación estimada · 2/4 pasadas cerradas · 2 pendientes**.

Código: `04513189ca38170974f2e6d2888f7e299183007b`. Fingerprint: `c5bec7300fa138f999f501fc63dd698fd349c6be3bf61df27b1c59341955bada`. [PR #4](https://github.com/capitanps02/elevenfate-reddit/pull/4) sigue siendo la única candidata. Base auditada 0.1.7 con traducción completa, Daily v7 y SDK 0.14.7.

## Estado real

La versión pública instalada en r/ElevenFate es **0.1.7**. La portada nueva se ha subido e instalado como **0.1.7.2 privada**, únicamente en r/elevenfate_dev2. No se ha publicado la portada en la comunidad pública. La 0.1.7.1 anterior queda como iteración histórica, sin otra cola de publicación.

En el post privado se verifica la versión efectivamente servida, portada ES/EN, reanudación del guardado de 12-08-2027 con 17 decisiones, tutorial inglés completo, cancelación de Nueva partida y entrada/retorno de Daily sin iniciar intento. La copia exportada antes/después es idéntica byte a byte. Los datos privados del guardado quedan fuera del paquete y de Git.

Se corrigió la exportación para el sandbox de Reddit: diálogo de texto, selección y copia, mensajes veraces si el portapapeles está bloqueado y retorno de foco. No se amplían permisos del iframe. Build bilingüe correcto, 388 eventos y 4.241 textos con missing=0. **317/317 pruebas locales** en un único lote limpio. CI del SHA: verify:reddit pasa; sesión extendida y cierre general pendientes al generar este registro. Evidencia: R3-PRIVATE-CANDIDATE.json.

## Contenido del paquete

Fuente de la candidata y configuración pública normal; fixtures legacy necesarios; bundle privado de revisión con inglés habilitado por `--locale-preview`; manifiesto SHA256 de los 23 archivos compilados, informe R3 y esta guía. El bundle privado es evidencia de revisión, no un build público certificado. No incluye credenciales, .env, token Devvit, node_modules ni partidas privadas. La instalación se realiza mediante Devvit, no cargando el ZIP en Reddit.

## Cierre de R3

1. Confirmar CI completo del SHA de código y guardar su resultado.
2. Completar zoom nativo 200 % en navegador externo sobre Reddit y revisión proporcional de rendimiento/plataforma. Cambiar dimensiones no acredita zoom nativo. El navegador integrado no permite verificar ese zoom.
3. Completar los escenarios restantes de aceptación privada, con guardados/RNG y Daily protegidos; no heredar certificación de 0.1.7.
4. Solo tras evidencia completa, actualizar los flags de `reddit/i18n/release-status.json` para su fingerprint, ejecutar `pnpm run verify:reddit` y `node scripts/check-locale-release.mjs`, y generar el bundle normal. Los tres flags pendientes siguen en false; no se desbloquean por preparar este paquete.

## R4: entrega pública preparada

Versión pública propuesta **0.1.8**, sujeta a comprobar disponibilidad y estado de revisión en ese momento. Antes de subir, consultar `devvit list installs ElevenFate` y `devvit view elevenfate`; evitar repetir una subida existente. Usar devvit.json normal, sin configuración de preview. Registrar commit/fingerprint y hashes del nuevo bundle normal. Subir la versión única, tramitar revisión/publicación y, en la fase autorizada de entrega, instalarla en r/ElevenFate.

Comprobar en el post público la versión servida, Español/English, Continue con la cuenta existente, tutorial, Daily y exportación. Registrar versión subida, aprobada, instalada y comprobada como estados distintos. Ninguno se da por hecho por el éxito de upload.

## Reversión

Referencia instalada anterior: **elevenfate@0.1.7** en r/ElevenFate. Ante regresión, reinstalar esa versión mediante Devvit y comprobar el post/guardados; sin borrar carreras ni Redis. La portada no introduce migraciones de datos. Una reinstalación no restaura por sí sola escrituras de partidas, por lo que la comprobación pública inicial evita acciones que modifiquen la carrera. Conservar el registro de entrega y el manifiesto final de la versión servida.

## Notas de versión propuestas

Primera pantalla con Continuar partida, Nueva partida, Daily y Tutorial; selector Español/English en paralelo. Idioma trasladado desde Simular a la portada. Tutorial voluntario sin modificar la carrera y navegación de retorno. Pulido de foco, contraste, zonas táctiles y pantallas pequeñas. Exportación de copias compatible con el sandbox de Reddit. Se conserva el contenido bilingüe completo y las prestaciones de 0.1.7.
