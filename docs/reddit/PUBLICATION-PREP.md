# Candidata de portada preparada para publicación

14 de octubre de 2026 · **96 % de preparación estimada · 2/4 pasadas cerradas · 2 pendientes**.

Código: `9377ffd816741d3d6bc3784eb28d3a49b182a3d0`. Fingerprint: `58646e75f49e27ec996d2cf4a7f2751b896da9f03c15b0dbf5f5c1d7db440c3c`. [PR #4](https://github.com/capitanps02/elevenfate-reddit/pull/4) sigue siendo la única candidata. Base auditada 0.1.7 con traducción completa, Daily v7 y SDK 0.14.7.

## Estado real

La versión pública instalada en r/ElevenFate es **0.1.7**. La portada nueva se ha subido e instalado como **0.1.7.4 privada**, únicamente en r/elevenfate_dev2. No se ha publicado la portada en la comunidad pública. La 0.1.7.1 anterior queda como iteración histórica, sin otra cola de publicación.

La revisión histórica de 0.1.7.2 verifica portada ES/EN, tutorial inglés completo, cancelación y Daily sin iniciar intento; la copia era idéntica antes/después de la navegación. La revisión actual de 0.1.7.4 verifica versión servida, cabecera, retrato, posición de ayuda y nombre obligatorio. La carrera actual de 18-09-2027 y 18 decisiones conserva exactamente los mismos bytes que en 0.1.7.3. No se restaura el guardado histórico sobre el progreso más reciente. Los datos privados quedan fuera del paquete y de Git.

Se corrigió la exportación para el sandbox de Reddit: diálogo de texto, selección y copia, mensajes veraces si el portapapeles está bloqueado y retorno de foco. No se amplían permisos del iframe. Build bilingüe correcto, 388 eventos y 4.241 textos con missing=0. **318/318 pruebas locales** en un único lote limpio. CI del SHA actual: en curso al generar este registro; los resultados de los SHA anteriores se conservan como históricos. Evidencia: R3-PRIVATE-CANDIDATE.json.

## Contenido del paquete

Fuente de la candidata y configuración pública normal; fixtures legacy necesarios; bundle privado de revisión con inglés habilitado por `--locale-preview`; manifiesto SHA256 de los 23 archivos compilados, informe R3 y esta guía. El bundle privado es evidencia de revisión, no un build público certificado. No incluye credenciales, .env, token Devvit, node_modules ni partidas privadas. La instalación se realiza mediante Devvit, no cargando el ZIP en Reddit.

## Cierre de R3

1. Confirmar CI completo del SHA de código y guardar su resultado.
2. El usuario informa resultado correcto de zoom 200 % sobre la candidata 0.1.7.3. Conservar ese resultado manual con su alcance; la revisión de los cambios posteriores incluye doce casos de layout local. Completar aceptación/rendimiento de la candidata ajustada, sin atribuirle una nueva medición nativa de zoom.
3. Completar los escenarios restantes de aceptación privada, con guardados/RNG y Daily protegidos; no heredar certificación de 0.1.7.
4. Solo tras evidencia completa, actualizar los flags de `reddit/i18n/release-status.json` para su fingerprint, ejecutar `pnpm run verify:reddit` y `node scripts/check-locale-release.mjs`, y generar el bundle normal. Los tres flags pendientes siguen en false; no se desbloquean por preparar este paquete.

## R4: entrega pública preparada

Versión pública propuesta **0.1.8**, sujeta a comprobar disponibilidad y estado de revisión en ese momento. Antes de subir, consultar `devvit list installs ElevenFate` y `devvit view elevenfate`; evitar repetir una subida existente. Usar devvit.json normal, sin configuración de preview. Registrar commit/fingerprint y hashes del nuevo bundle normal. Subir la versión única, tramitar revisión/publicación y, en la fase autorizada de entrega, instalarla en r/ElevenFate.

Comprobar en el post público la versión servida, Español/English, Continue con la cuenta existente, tutorial, Daily y exportación. Registrar versión subida, aprobada, instalada y comprobada como estados distintos. Ninguno se da por hecho por el éxito de upload.

## Reversión

Referencia instalada anterior: **elevenfate@0.1.7** en r/ElevenFate. Ante regresión, reinstalar esa versión mediante Devvit y comprobar el post/guardados; sin borrar carreras ni Redis. La portada no introduce migraciones de datos. Una reinstalación no restaura por sí sola escrituras de partidas, por lo que la comprobación pública inicial evita acciones que modifiquen la carrera. Conservar el registro de entrega y el manifiesto final de la versión servida.

## Notas de versión propuestas

Primera pantalla con Continuar partida, Nueva partida, Daily y Tutorial; selector Español/English en paralelo. Idioma trasladado desde Simular a la portada. Tutorial voluntario sin modificar la carrera y navegación de retorno. Pulido de foco, contraste, zonas táctiles y pantallas pequeñas. Exportación de copias compatible con el sandbox de Reddit. Se conserva el contenido bilingüe completo y las prestaciones de 0.1.7.

### Ajustes tras la revisión del usuario

El usuario confirma que el zoom está bien en la candidata anterior y pide estos ajustes: retirar el control de pausa superior, colocar fecha/Partida a la derecha de la cabecera, llevar Ayuda y datos al extremo inferior derecho de portada, recuperar la altura del retrato y preguntar el nombre al crear carrera. La cabecera Reddit se simplifica sin retirar las acciones principales de simulación. Retrato entre 220 y 384 px en los tamaños móviles revisados; ayuda en el flujo inferior, sin superposición. Nueva partida conserva nombre vacío obligatorio y cancelación; una carrera local creada con «Álex Prueba» muestra ese nombre. Doce casos ES/EN pasan sin desbordamiento horizontal ni controles visibles menores de 44 px.

La 0.1.7.3 corrigió el foco tras la exportación asíncrona de cuenta y se verificó en Reddit: formato correcto, texto de solo lectura y foco devuelto al botón de origen. La 0.1.7.4 incorpora los ajustes gráficos posteriores. Son iteraciones privadas de la misma candidata, no publicaciones públicas ni colas nuevas.
