# ElevenFate · beta para Reddit

Vive una carrera de futbolista en español o inglés: decisiones, partidos, contratos, fichajes, relaciones, lesiones y retirada. El motor y el contenido proceden del juego validado para Android; esta edición adapta la interfaz y la persistencia a Reddit.

## Cómo jugar

Pulsa **Jugar a ElevenFate** e inicia sesión en Reddit. El inicio muestra al jugador, forma, físico y fatiga. **Simular próximo partido** avanza hasta un partido o una situación importante: elige, lee sus consecuencias y continúa. Carrera, Mundo, Relaciones y Perfil permiten consultar tu historia.

**Daily** recorre una carrera de los 18 a los 38 años en 30 decisiones y seis etapas. Empiezas eligiendo entre tres equipos; en las etapas siguientes puedes quedarte o aceptar una de dos propuestas. Las decisiones deportivas y personales avanzan la carrera y cada etapa muestra partidos, titularidades, goles y asistencias. El cierre incluye títulos colectivos y distinciones individuales según las reglas del Daily. Conserva tu intento por cuenta, comunidad y día UTC. Puedes practicar por separado. Los Daily completados entran automáticamente en la clasificación del día: Top 25, posición y puntuación propias. El botón Top permite consultarla antes de empezar; la práctica queda fuera. El calendario comprimido, las reglas de palmarés y la fórmula de puntuación son propios del Daily y provisionales; no hay premios ni compras.

**Tu partida** permite recuperar el estado confirmado, descargar/importar una copia, empezar otra carrera o eliminarla con confirmación. Una segunda sesión antigua recibe un conflicto en lugar de sobrescribir progreso.

## Comunidad y revisión

Comunidad dedicada al lanzamiento: [r/ElevenFate](https://www.reddit.com/r/ElevenFate/). La versión candidata se prepara para revisión; la disponibilidad pública depende de la aprobación e instalación de Reddit. Comunidad de pruebas: r/elevenfate_dev2, privada, con [post de ejemplo](https://www.reddit.com/r/elevenfate_dev2/comments/1wwq9n4/elevenfate_tu_carrera_tus_decisiones_tu_legado/).

Para instalar, usa la versión aprobada de `elevenfate` desde Developers. Un moderador con permisos de publicaciones crea el post mediante **Crear publicación de ElevenFate** en el menú de la comunidad. La creación también verifica permisos en el servidor. El juego no publica comentarios ni mensajes privados. El ranking se actualiza dentro del juego al completar el Daily, sin crear posts.

## Datos

El servidor usa la identidad autenticada de Reddit para guardar una carrera y su copia anterior en Redis de Devvit. Las partidas pertenecen a la instalación de la comunidad; no se comparten entre subreddits. Se guardan el nombre del personaje, progreso y decisiones. El juego no solicita contraseñas ni utiliza servidores externos, publicidad, compras o seguimiento propio.

Daily y práctica se guardan separadamente y caducan siete días después del cambio de día. El ranking diario automático guarda identidad y puntuación confirmada para evitar duplicados; muestra posiciones y puntos sin nombres públicos, y caduca ocho días después del último registro. Eliminar la carrera elimina partida y copia; queda solo un contador para bloquear escrituras antiguas. Detalles sobre datos (`docs/reddit/DATOS.md` en el repositorio).

## Verificación

32 pruebas de adaptación aprobadas: aislamiento de cuentas, conflictos, reintentos, fallos de red, recuperación, permisos de publicación, determinismo y ranking. 221 pruebas de regresión de interfaz, acciones, motor, sesión y guardado aprobadas en la entrega del simulador anterior.

En Reddit real: carrera recuperada tras actualización, Daily/práctica completos, ranking publicado con 463 puntos y conflicto de una sesión antigua rechazado. Interfaz revisada en Mobile y Desktop y nueve tamaños locales; ranking automático con tres cuentas ficticias locales y 32 pruebas. El usuario confirma interfaz correcta en la app de Reddit en iPhone 13. Quedan pendientes Android físico, una cuenta normal independiente y la matriz completa de carrera avanzada en Redis real; no se presentan como pruebas realizadas.

Auditoría local de una carrera completa: 447 acciones hasta retirada, máximo 835.491 bytes por partida y 1.890.559 bytes incluyendo copia anterior. Dentro de los límites actuales; no demuestra latencia real para todas las carreras. Evidencia (`docs/reddit/save-size-audit.json` en el repositorio).

## Desarrollo

Node 24+, pnpm 11.19.0, Devvit 0.14.7.

```sh
pnpm install --frozen-lockfile
pnpm run verify:reddit
pnpm run preview:reddit
```

La vista local usa cuenta simulada y memoria. `src/` reutiliza el motor original con cuatro conexiones de competiciones exclusivas de la copia Reddit; `reddit/client/` contiene la adaptación visual y de guardado; `reddit/server/` valida partidas e identidad y usa Redis. No hay vídeos ni código Android en la entrega Reddit.

```sh
pnpm exec devvit upload
pnpm exec devvit install elevenfate_dev2 elevenfate@VERSION
pnpm run publish:reddit
```

El repositorio es una copia independiente. No se modifica el juego original. Plan del Daily (`docs/reddit/DAILY.md` en el repositorio), verificación visual (`docs/reddit/UI-REDESIGN.md` en el repositorio).

Competiciones y estado de la nueva beta: COMPETITIONS.md (`docs/reddit/COMPETITIONS.md` en el repositorio).

## Candidata de interfaz C3 · 18 de octubre de 2026

56 vistas implementadas con fuentes locales y componentes compartidos. Interfaz creada e integrada al 100 %; plan de aceptación al 95 %, con revisión en móvil físico pendiente. 512 pruebas automáticas aprobadas (335 Reddit/UI y 177 sesiones/guardados), 224 layouts españoles y 80 revisiones inglesas. Candidata 0.1.8.1 comprobada en Reddit privado; instalación pública 0.1.8 conservada. La sección de verificación anterior describe la beta original. Estado actual y proceso de lanzamiento: [PUBLICATION-C3.md](docs/reddit/PUBLICATION-C3.md).

`pnpm run prepare:reddit` prepara la compilación normal. `pnpm run upload:reddit` sube una candidata privada. `pnpm run publish:reddit` exige los certificados y las huellas de esa implementación. El gate rechaza builds de vista previa, recursos alterados y archivos de QA en producción.
