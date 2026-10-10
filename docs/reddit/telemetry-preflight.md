# Telemetría de ElevenFate

## Estado y alcance

Referencia: Plan de ingeniería de telemetría para ElevenFate, versión 1.4, 10 de octubre de 2026. Este cambio prepara un núcleo aislado, un contrato de diagnóstico local y un medidor de duración por segmento. No conecta eventos al juego, no activa recogida y no implementa transporte, identidad ni panel.

Base inspeccionada: `capitanps02/elevenfate-reddit`, rama `codex/reddit-adaptation`, HEAD `91b6449b6e9dc4226f0b36b35384bc3558a425dc`. El árbol recursivo no contiene AGENTS.md. Dependencias declaradas: Devvit/Web 0.14.6, esbuild 0.28.2, Express 5.2.1, Node >=24. La versión publicada y el bundle desplegado aún deben verificarse; leer el repositorio no acredita producción.

## Fronteras verificadas y futuros puntos de captura

| Flujo | Frontera | Regla de integración |
| --- | --- | --- |
| Carrera | `src/session/game-session.ts`, `dispatch` y `#execute` | La cola ejecuta comandos; espera `#commit` antes de publicar `#snapshot`. Observar el resultado desde el adaptador tras resolver la promesa existente. Nunca añadir un await analítico. Replays no son acciones nuevas. |
| Guardado cliente | `reddit/client/save-store.mjs`, `api`, `write`, `refresh` | Intento y confirmación se correlacionan fuera del snapshot. Diferenciar HTTP rechazado de respuesta perdida; GET de recuperación no prueba por sí solo que la operación concreta se guardó. |
| Guardado servidor | `reddit/server/career-service.mjs` | WATCH, lectura mediante redis, MULTI/EXEC y repetición de bytes idénticos. Ninguna clave analítica dentro de esta transacción. |
| Daily y práctica | `reddit/client/daily.mjs`, `request`, `act` | Captura futura solo tras actualizar estado confirmado; distinguir lectura, start, restart y command. Exposición mediante activación de pantallas, sin geometría del DOM. |
| Daily servidor | `reddit/server/daily-service.mjs`, `act` | Motor y persistencia propios; score publicado después de guardar. Daily usa día UTC: conservar `dailyId` como identidad de reto aunque el panel agrupe por Europe/Madrid. |
| Bootstrap | `reddit/server/index.mjs`, `/api/init` | Actualmente devuelve identidad del juego, sin permiso analítico ni lease. No reutilizar userId en eventos; resolver elegibilidad y seudónimo en servidor antes de activar. |
| Ingestión futura | `reddit/server/index.mjs` | Express JSON global permite 2 MB. Montar un parser de 16 KiB para la ruta analítica ANTES del parser global; probar cuerpo sobredimensionado y acceso. No cambiar límites del guardado. |
| Bundle | `scripts/build-reddit.mjs` | Entradas explícitas game/splash e index. Los archivos nuevos del núcleo no están importados por ellas. El build completo y su metafile se verificarán al conectar el adaptador. |

## Contrato del prototipo

`createTelemetryCore()` devuelve modo off por defecto. `diagnostic` solo admite códigos técnicos; `behavior` admite ambos grupos. Configuración y reloj son dependencias internas de confianza. `tryRecord(code, a, b, c)` solo admite números primitivos finitos: no recorre objetos del juego ni ejecuta getters. En el futuro punto de captura se exige `if (core.enabled)` antes de evaluar argumentos.

Catálogo local v1 en `reddit/telemetry/diagnostic-contract.mjs`: 1 intento de guardado, 2 confirmado, 3 incierto, 4 reconciliado; 5 lectura solicitada, 6 confirmada, 7 fallida, 8 error técnico normalizado. Códigos 32–39 siguen reservados. No emitir este formato local a una red ni interpretarlo como esquema de ingestión. No registrar opciones narrativas en diagnostic.

| Código | a | b | c |
| --- | --- | --- | --- |
| 1 save_attempt | Secuencia local de operación positiva | Generación esperada | Bucket de tamaño 0–7 |
| 2 save_confirmed | Misma operación | Generación confirmada | Duración no negativa en ms |
| 3 save_uncertain | Misma operación | Error permitido 1–8 | Duración en ms |
| 4 save_reconciled | Misma operación | Generación confirmada | Duración en ms |
| 5 load_requested | Secuencia local de operación | Origen current 1, previous 2, raw 3 | Cero reservado |
| 6 load_confirmed | Misma operación | Generación confirmada | Duración en ms |
| 7 load_failed | Misma operación | Error permitido 1–8 | Duración en ms |
| 8 client_error_summary | Código técnico permitido 1–16 | Recuento positivo | Cero reservado |

Errores 1–8: red, respuesta, conflicto, rechazo, tamaño, partida inválida, autenticación y desconocido. Los hooks futuros deben clasificar el resultado observado, sin inferir confirmación desde un GET genérico. La operación local necesita el ámbito de sesión para correlación remota. No almacenar commandId, texto de error ni snapshot en estas posiciones. `recordDiagnostic` valida antes de capturar y contiene excepciones del observador. El catálogo aún requiere comprobar los códigos contra las fronteras reales antes de integrarlo.

El ring contiene 256 registros, de los que como máximo 192 son de comportamiento. Los técnicos pueden ocupar todos los huecos. El lote en vuelo conserva sus registros en el ring: no libera espacio hasta ack o expiración. Solo existe una copia inmutable de hasta 32 registros. El almacenamiento tipado ocupa 10 496 bytes; este dato excluye objetos JavaScript, copia inmutable, futura serialización y runtime. Certificar el techo global de 128 KiB y memoria añadida de 2 MiB requiere el adaptador completo y mediciones.

`freeze(prefix)` crea un lote inmutable y devuelve el mismo mientras siga pendiente. El ID incorpora la primera secuencia, impidiendo que un ack antiguo retire otro lote que reuse el prefijo dentro del núcleo. El adaptador futuro debe usar un ámbito de sesión único y deduplicación autorizada en servidor. `ack(batch.batchId)` retira solo ese lote; al alcanzar cinco minutos lo descarta como perdido. `expire()` es explícito, sin temporizador propio; el planificador futuro debe llamarlo antes del siguiente envío. Cadencia, dos reintentos, cuotas y permiso no están implementados.

`disable()` deja de capturar, vacía las posiciones y elimina la referencia interna del lote. El adaptador deberá purgar también cualquier copia que conserve y cancelar únicamente sus recursos. Fallo, tiempo inválido o regresión del reloj desactiva el núcleo. No hay red, timers, listeners, almacenamiento local ni imports del motor.

## Duración por segmentos

`reddit/telemetry/duration.mjs` mantiene un solo segmento con estado constante. Solo se crea en modo behavior. El adaptador debe entregar hooks explícitos y IDs numéricos de segmento estrictamente crecientes; no hay heartbeat ni observación automática del DOM. `setVisible`, `setPaused` y `setWaiting` cierran el intervalo anterior antes de cambiar estado. El tiempo visible incluye pausa y espera mientras la vista sea visible; el tiempo activo las excluye y termina 120 s después de la última acción válida. Volver a mostrar la vista no renueva ese plazo.

`startSegment` devuelve el resumen cerrado del segmento anterior y reinicia totales y revisión. Usarlo al cambiar carrera, modo o día; la correspondencia segmentSeq/run_id se resolverá en el adaptador permitido. `checkpoint` devuelve totales acumulados inmutables, revisión creciente y partial=true mientras el segmento siga abierto. `close(false)` solo marca completo un segmento cuyo cierre se ha observado; no equivale a carrera finalizada. En cierre abrupto solo existe el último checkpoint recibido: no añadir silencio hasta el momento de análisis.

El planificador futuro deberá coalescer resúmenes dentro del mismo presupuesto global del núcleo, transmitirlos con counter_epoch y deduplicarlos. Este medidor no los introduce aún en la cola ni conserva históricos de segmentos. Una secuencia simulada de dos horas verifica exactitud; no sustituye una prueba real de heap, batería o carga de esa duración.

## Validación y pendientes

Ejecutar `node --test reddit/test/telemetry-*.test.mjs`: 32 pruebas superadas en Node 24.19.0. Cubre núcleo, contrato, correlación de incertidumbre, visibilidad, inactividad, pausas y esperas superpuestas, cambio de segmento, checkpoints, cierre parcial y reloj defectuoso. El benchmark `node scripts/bench-telemetry-core.mjs` es una comprobación de laboratorio Node; mide coste amortizado por bloques, no p99 por llamada ni rendimiento Reddit.

P0 está parcialmente verificado: HEAD, fronteras y build declarados. Pendientes: versión desplegada, baseline visual y de rendimiento, dispositivos físicos, capacidad real de transacciones y permisos. P1 tiene un contrato ejecutable de captura técnica, pero siguen pendientes esquema remoto, catálogo definitivo, run_id, identidad permitida, ventanas de admisión, generación de permisos y retención. P2 y el cálculo local de P5 tienen prototipos probados, sin integración ni certificación. P3, P4 y P6–P8 siguen pendientes.

No afirmar coste cero, paridad integrada, certificado energético ni recogida activa. El próximo cambio debe cerrar P1 y medir el núcleo antes de conectar diagnósticos. Mantener esta entrega como draft hasta revisar dichas fronteras.
