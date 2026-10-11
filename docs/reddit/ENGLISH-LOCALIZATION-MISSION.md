# ElevenFate Reddit — Misión de localización ES → EN

Fecha de auditoría: 2026-10-11. Rama base: `codex/reddit-adaptation`.

## Alcance y situación comprobada

Se trata de la **edición Reddit** independiente, no de Android. En el árbol de la rama base no había catálogos `i18n`, `locales` ni pruebas específicas de idiomas. La aplicación aún estaba en español (`reddit/client/splash.html`, `reddit/client/game.html`, `reddit/client/daily.mjs`, `web/game-ui.js`).

Este lote añade únicamente el **primer catálogo bilingüe revisable**, con 99 cadenas UI, 6 nombres de etapas, 24 eventos alternativos Daily (título + cuerpo), 12 etiquetas de elección y 12 textos de servidor/estadísticas. El catálogo **todavía no está conectado al ejecutable**. No representa una localización íntegra de la app.

## Arquitectura segura antes de activar inglés

1. Idioma de presentación `es` / `en`, con español por defecto y preferencia local. Elegir antes de acceder a carrera o Daily; `lang` y `Intl.DateTimeFormat` deben concordar.
2. El motor, el scheduler, la selección del evento, el RNG, el estado, los efectos, los clubes, los scores, Redis, `dailyId`, `choiceId`, fingerprints, saves y rankings **no dependen del idioma**.
3. Para Daily, traducir **después de obtener** `dailyRunView` usando `event.id` y `choice.id`; la historia y los mensajes persistidos se conservan en formato original/canónico y se traducen al renderizar la respuesta. Si una elección de un evento canónico no tiene localización, no presentarlo como cobertura inglesa completa.
4. Para las historias originales de `src/content/events/**`, extraer `title`, `body`, `choices[].label`, outcomes/messages y microfeeds por IDs estables. Mantener catálogos ajenos a los hashes de identidad narrativa `contentIdentity` y a los registries congelados: **no editar el copy canónico del motor** para traducirlo.
5. Para el modo carrera, cubrir `web/game-ui.js`, resultados, menús, acciones, simulación, ofertas, estadísticas, perfiles, notificaciones, cinemáticas y mensajes de recuperación sin modificar el motor.
6. No traducir nombres propios de clubes, IDs, rutas, claves JSON, emojis, puntuaciones ni nombres personales. Usar inglés futbolístico británico: `football`, `manager`, `fixtures`, `starts`, `transfer`, `dressing room`, `playing time`.
7. Textos interpolados deben declararse por clave y parámetros (`{club}`, `{score}`, etc.); validar claves y placeholders en ambos idiomas. `score.breakdown.label`, `STAGES[].name`, `lastMessage` y `history` también son texto visible.
8. El cliente no debe depender de llamadas externas de traducción ni traducir a través de red en ejecución: catálogos empaquetados en bundle, lectura O(1), mínimo coste de memoria, sin cambios en la simulación ni en los tiempos de respuesta de Redis.

## Inventario de los dos bloques de texto

- **Estático**: splash, login, error, ayuda Daily, botones, rankings, tabla de liga, estadísticas, 6 etapas, práctica, mensajes de fin y clubes.
- **Dinámico**: 24 eventos alternativos + sus elecciones, historias canónicas del motor que el Daily selecciona por scheduler, consecuencias, todos los mensajes del servidor, honores, historial y la interfaz amplia del modo carrera.

La traducción de un nombre de evento **no** se puede aplicar solo por índice de pantalla: debe usar un ID persistente. Los fallback `DAILY_{stage}_{slot}` sí tienen IDs reproducibles, pero los demás provienen de `EVENTS`.

## Calidad y gates de entrega

- **G1**: 100 % claves de UI visibles y placeholders en ambas lenguas, sin texto español accidental en la vista inglesa.
- **G2**: 100 % de eventos y choices potencialmente alcanzables en Daily traducidos por ID; QA de 30 decisiones x 6 etapas con caminos de clubes y decisiones variados.
- **G3**: historia guardada, reanudación y ranking idénticos en ambos idiomas para misma semilla y mismos `choiceId`.
- **G4**: pruebas de largo de texto en 360/390/412 px y pantalla grande, accesibilidad/lectores de pantalla, sin botones cortados.
- **G5**: build Devvit, bundle sin dependencias externas, y prueba de idioma en Reddit real antes de publicar; no decir que está validado hasta ejecutarlo.

## Lista priorizada

1. Conectar `es.json` y `en.json` al splash y al Daily, sin mezclar configuración del idioma con la carrera.
2. Inventariar y traducir automáticamente en lotes los eventos canónicos *alcanzables* en Daily y sus outcomes, con revisión humana de semántica, placeholders y contexto futbolístico.
3. Traducir modo carrera y ayudas en `web/game-ui.js`, usando el mismo catálogo y control de idioma.
4. Verificar paridad, hacer QA visual, entonces exponer selección de idioma a todos los jugadores.

**Importante**: los catálogos creados en esta rama son un primer lote de textos reales en inglés, **no una implementación operativa de inglés**. Nada debe fusionarse como “localización completa” sin G1–G5.
