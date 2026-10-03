# ElevenFate · Reddit Edition

Juego de carrera futbolística en español. Toma decisiones y vive temporadas, contratos, fichajes, relaciones, lesiones y selección hasta la retirada.

Esta edición reutiliza motor, contenido, interfaz y estilos de la base validada para Android. Sustituye la plataforma por Devvit y el guardado principal por Redis. Presenta escenas con imagen y título; excluye vídeos, anuncios, compras y código nativo Android.

**Estado:** aplicación registrada y primera versión subida/instalada en r/elevenfate_dev2. Daily en fase de prototipo. Pendientes post jugable, Redis real, dispositivos y revisión/aprobación.

## Jugar

Abre el post y pulsa **Jugar a ElevenFate**. Inicia sesión en Reddit para guardar. Usa **Simular** para avanzar hasta un momento importante, elige y lee las consecuencias. Carrera, Mundo, Relaciones y Perfil permiten gestionar tu historia.

La carrera queda asociada a tu cuenta en la comunidad donde está instalado el juego. Continúa en otro dispositivo dentro de esa misma comunidad; no se comparte automáticamente entre comunidades. Tu partida permite exportar/importar JSON, recuperar una copia anterior, empezar otra historia y eliminarla con confirmación.

## Desarrollo

Node 24+, pnpm 11.19.0; cuenta Reddit/Devvit para el playtest.

```sh
pnpm install --frozen-lockfile
pnpm run verify:reddit
pnpm run preview:reddit
```

Vista previa: `http://127.0.0.1:4173/game.html`. Cuenta simulada y memoria que se pierde al reiniciar servidor. Sirve para interfaz y protocolo; no certifica Redis/Reddit.

```sh
pnpm exec devvit login
pnpm exec devvit upload
pnpm exec devvit playtest NOMBRE_COMUNIDAD_PRUEBA
```

La aplicación `elevenfate` está registrada; la CLI está autenticada y la comunidad de prueba es `elevenfate_dev2`. El menú de moderación **Crear publicación de ElevenFate** crea el post jugable. No se publican comentarios automáticamente.

## Arquitectura

- `src/`: motor original sin modificaciones.
- `web/`: interfaz reutilizada con inyección de almacén y presentación de escenas.
- `reddit/client/`: inicio, entrada y adaptador de guardado.
- `reddit/server/`: partidas, identidad de plataforma y creación del post.
- `reddit/test/`: conflictos, reintentos, aislamiento y partidas reales.
- `docs/reddit/`: origen, integridad y evidencias.

El servidor deriva usuario del contexto Devvit, valida snapshots con el motor y realiza escrituras condicionales. Conserva estado confirmado y una copia anterior. Las cuentas anónimas no pueden guardar. Los clientes antiguos reciben un conflicto en lugar de sobrescribir progreso. Las salidas sin escritura cierran la transacción con `discard`. Límite inicial: 1.500.000 bytes por partida.

Auditoría de una carrera completa (seed 424242, primera opción, 447 comandos): máximo 835.491 bytes por snapshot, 946.678 bytes por petición HTTP y 1.890.559 bytes por registro con copia anterior. Dentro de los límites; no garantiza todas las semillas ni la latencia de Redis real. Evidencia y script reproducible: [save-size-audit.json](docs/reddit/save-size-audit.json) y `node scripts/audit-reddit-save-size.mjs`.

## Verificación y publicación

217 pruebas locales aprobadas: 177 originales de sesión/guardado/acciones, 28 de interfaz y acciones, y 12 nuevas. Las 12 nuevas se han repetido tras incorporar el prototipo Daily; motor y estilos originales no han cambiado en esta revisión. Configuración validada por Devvit 0.14.6. Inicio, decisión, desenlace y recarga comprobados en navegador; primera decisión a 390 × 844.

Pendientes: playtest con Redis real, Reddit Android/iOS/web, actualización conservando partidas, roles y medición de carga. Tras completarlos:

```sh
pnpm exec devvit publish
```

Después de aprobación, instalar versión aprobada y verificar post definitivo desde una cuenta normal. Daily tiene un [prototipo y plan de pruebas](docs/reddit/DAILY.md), accesible mediante «Daily · prueba». Rankings, inglés y Gold siguen pendientes.

## Datos y origen

Ver [información sobre datos y partidas](docs/reddit/DATOS.md). No incorpora anuncios, compras ni seguimiento externo. La caché contiene únicamente estados confirmados y nunca se sube automáticamente para reemplazar el servidor.

Copia Git independiente con historial y cambios locales de Android. Instantánea anterior a retirada de plataformas: `4a82640`. Original intacto. Informes de Android conservados como referencia, no como certificación de esta edición. Workflows anteriores archivados en docs/reddit/upstream-workflows; CI actual ejecuta verificaciones de Reddit.
