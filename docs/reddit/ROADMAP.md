# ElevenFate Reddit — plan único de portada, recalculado

14 de octubre de 2026 · Revisión 2.3 · **96 % estimado; R1 y R2 cerradas; 2 pasadas restantes**.

Sustituye los porcentajes y colas anteriores de portada. La candidata sigue siendo [PR #4](https://github.com/capitanps02/elevenfate-reddit/pull/4); no se abre otra implementación. El porcentaje mide preparación y trabajo existente reutilizable, no certificación ni publicación. R1 ya concilia la fuente 0.1.7 y los deltas únicos de portada. La certificación y publicación de esta candidata siguen pendientes.

## 1. Corrección de la base

La rama histórica de GitHub partía de 91b6449 y la inspección anterior de la instalación 0.1.6. Esa rama no acreditaba que el producto careciese de inglés. **La traducción independiente ya está hecha**: se reutiliza, no se repite.

Fuente de la subida 0.1.7 localizada en:
`/Users/capitanps/Documents/Codex/2026-10-12/ne/work/elevenfate-reddit`.

Evidencia leída y contrastada en esta revisión:

- `work/publish-official.log`: creación del paquete de 0.1.7 y envío a revisión completados.
- `outputs/DESPLIEGUE-REAL-PENDIENTE.md`: identifica esa copia como la fuente enviada, conservando la candidata privada 0.1.6.7.
- Fingerprint actual `924fdc3e3baeb5ac65116430c48f5edcbcfba55226b9cd1ff8d6167572d5fa32`: coincide exactamente con `release-status.json`. EnglishReady, legacyCoverage, completeRegression, visualAndLanguageReview y redditPlaytest están en true para esa copia.
- 44/44 archivos del manifiesto de integración de analítica coinciden por SHA256, sin discrepancias.
- Coverage: 388/388 eventos, 3.646/3.646 textos activos y 4.241/4.241 textos totales traducidos; missing=[]; SDK/Web/Devvit 0.14.7.
- La copia principal bajo Documents/ChatGPT/Reddit también tiene cobertura completa, pero un fingerprint distinto y redditPlaytest=false. No se identifica como el paquete subido solo por ser la carpeta principal.
- La copia del primer trabajo de inglés tiene el fingerprint 6536eb1c, coincidente con su informe final histórico, pero el release-status guardado allí ya no lo certifica. Se conserva como referencia; se elige la copia de entrega auditada anterior.

No se han reejecutado las 265/43 pruebas históricas de analítica ni las 177 de traducción: se reconocen como evidencia de la entrega existente, no como pruebas nuevas de la portada. La coincidencia de fingerprint no sustituye la validación de una candidata modificada.

**R1 cerrada el 13-Oct.** Fuente conciliada con portada y recuperación de guardados de 3c2b6cdc. Los 197 archivos del motor y los 32 archivos de servidor, componentes compartidos, analítica y telemetría coinciden byte a byte con la fuente auditada. Se conserva Daily v7/legacy, SDK 0.14.7, privacidad, ayuda y observadores. Una única preferencia `elevenfate.language.v1` y el runtime completo traducen también los nuevos textos de portada/formulario/tutorial. Véase [INTEGRATION-017.json](INTEGRATION-017.json).

Estado consultado el 14-Oct: comunidad pública r/ElevenFate instalada en 0.1.7; candidata de portada 0.1.7.2 instalada solo en r/elevenfate_dev2. Se verifica también la URL de la versión servida en el post privado. No se duplica la publicación de 0.1.7. Versión subida, aprobada e instalada son estados diferentes.

## 2. Alcance que se conserva

Primera pantalla con **Continuar partida / Nueva partida / Daily / Tutorial** en una columna. Debajo, **Español / English** en paralelo. Continuar exige guardado confirmado; Nueva conserva cancelación y protección de sustitución; Daily vuelve al origen; tutorial voluntario de tres pasos sin escrituras. Arte y estética existentes, CTA azul, oro moderado, controles legibles, foco, reduced-motion y acceso sin clipping.

En la fuente bilingüe ya existen controles de idioma en acceso/juego y diálogos. Su ubicación debe conciliarse con la portada: retirar el selector de Simular, conservar la preferencia y los textos completos, y comprobar que el selector de portada es la única vía prevista en ese recorrido. No volver a implementar ni traducir el idioma para conseguir ese traslado.

## 3. Duplicidades retiradas de la cola

| Trabajo que se estaba repitiendo | Decisión vigente |
|---|---|
| Traducir interfaz, 388 historias, resultados, roles y errores desde cero | Cerrado como construcción del idioma: reutilizar el runtime y catálogos completos de la fuente auditada |
| Mantener dos pipelines de localización en paralelo | R1 consolida el pipeline existente; adapta solo los textos y conexiones nuevos de portada/tutorial. Retira los adaptadores/catálogos redundantes una vez conectada su sustitución y pasada la regresión |
| Volver a integrar el seed de PR #3 | No hacerlo: el idioma completo lo supera y los datos iniciales ya se reutilizaron |
| Reconstruir portada, formulario, navegación y tutorial ya hechos | Conservar los componentes de PR #4; corregir únicamente diferencias con 0.1.7 y defectos comprobados |
| Repetir P0/P1/P2 como pasadas adicionales o seguir seis cierres superpuestos | Absorber su conciliación en R1/R2 y su aceptación en R3; ya no hay doble contador |
| Reimplementar analítica/consentimiento/panel a partir de PR #2 | La fuente 0.1.7 ya los incluye. Preservar observadores y APIs; no insertar el prototipo anterior encima |
| Reintegrar puntuación antigua de PR #1 | Preservar Daily v7 y compatibilidad v3–v6 de la fuente real; puntuación nueva queda fuera de portada |
| Rehacer SDK y Redis desde 0.14.6 | Reutilizar la base 0.14.7 y su evidencia; verificar solo la integración afectada |
| Crear otra corrección de guardado | Recuperación preparada en 3c2b6cdc, con 20 tests focalizados reportados. Conciliarla con requestJSON y observers de 0.1.7, sin duplicar timeout, reintentos ni eventos |
| Ejecutar auditorías completas por cada texto | Un pase proporcional por cambio y una validación final del SHA integrado; conservar pruebas previas sin sumar suites solapadas |
| Publicar/instalar otra 0.1.7 o duplicar el seguimiento de la entrega | Conciliar con el flujo existente. La portada modificada requerirá su candidata/version propia cuando esté validada; no sobrescribir la fuente aprobada |

R1 retira físicamente 40 archivos del prototipo superado, incluidos adaptadores/catálogos parciales y pruebas específicas de ese pipeline. Se mantienen las pruebas de los flujos únicos y se conectan al runtime completo. No quedan imports del pipeline retirado. Los deltas del motor que solo servían a las traducciones parciales se sustituyen por el motor exacto de 0.1.7.

## 4. Contador: R1/R2 cerradas, dos pasadas pendientes

| Pasada | Trabajo concreto | Cierre verificable |
|---|---|---|
| **R1 — Conciliar fuente e integración — CERRADA** | Fijar la copia auditada de 0.1.7 como base; llevar los deltas únicos de portada y guardado; preservar SDK 0.14.7, idioma completo, Daily v7/legacy, ayuda, privacidad y analítica; consolidar pipelines y separar cambios ajenos | Una candidata coherente y versionada; inventario de diferencias cerrado; una sola localización; cero pérdida de prestaciones existentes |
| **R2 — Terminar portada y tutorial — CERRADA LOCALMENTE** | Reutilizar menú y tutorial; mover idiomas a portada y retirar selector de Simular; pulir recorte, contraste, targets, textos nuevos y foco; probar 320×480, 360×800, 390×844, 412×915, 375×600, 900×650 | Seis controles claros; ningún menú duplicado; acciones y retorno correctos; estética, reflow/scroll y ES/EN sin recortes; tutorial sin escrituras |
| **R3 — Validar candidata exacta** | Build/CI del SHA integrado; pruebas afectadas de idioma, guardado y navegación; reanudación en estados pendientes, conflictos, respuesta perdida, Daily existente, privacy/analytics preservadas; prueba privada Reddit, zoom nativo y rendimiento proporcional | Evidencia del mismo SHA/fingerprint; partidas/RNG/score intactos en escenarios verificados; ambos idiomas completos y rutas reales correctas |
| **R4 — Entrega y comprobación** | Coordinar el flujo de versiones ya existente; verificar revisión/instalación efectiva; entregar la portada validada y comprobar post, idioma, reanudación y Daily; registrar reversión | Versión servida y fuente coinciden, experiencia comprobada y registro único de entrega. Publicación se realizará en su fase autorizada, no en este recálculo |

El contador sigue siendo R1–R4: **2/4 cerradas; 2 restantes**. R2 cierra el pulido y comprobaciones locales. Portada: seis tamaños por idioma; carrera: 72 casos (seis pantallas × seis tamaños × ES/EN), sin overflow horizontal, controles visibles ≥44 px y sin selector en Simular. Daily español: seis tamaños sin overflow ni targets pequeños. Teclado: formulario, desplegables, tabulación de portada, cambio de idioma con Enter, foco visible, Escape en clasificación y ayuda, con retorno de foco. Se conservan apertura y foco de la ayuda del tutorial en cambios de idioma/lecturas; foco de Reintentar al desaparecer el control; lang propio en Español/English; bordes de campos con contraste 4,02:1; acceso a clasificación ampliado de 32 a 44 px; safe areas conservadas también en ventanas bajas.

**Límite de la revisión local:** el atajo de zoom nativo no altera viewport, DPR ni escala en el navegador integrado. No se declara zoom real aprobado. Esa comprobación se concentra en **R3**, en la superficie real de Reddit, junto con dispositivo/plataforma y candidata exacta; no abre otra pasada. Tampoco se heredan los gates de la entrega 0.1.7.


Fuera de estas cuatro pasadas: cambiar puntuación, ampliar telemetría, monetización, featuring y promoción. Se preserva lo integrado, sin abrir nuevos frentes.

## 5. Cálculo transparente del 96 %

Se mantienen los pesos de preparación históricos; P0–P8 no son otra cola.

| Componente | Peso | Preparación estimada | Aporte |
|---|---:|---:|---:|
| Baseline/conciliación P0 | 8 % | 100 % | 8 % |
| Contrato P1 | 10 % | 100 % | 10 % |
| Portada P2 | 15 % | 100 % | 15 % |
| Flujos P3 | 20 % | 100 % | 20 % |
| Traducción reutilizada P4 | 20 % | 100 % | 20 % |
| Simular P5 | 5 % | 100 % | 5 % |
| Arte/accesibilidad local P6 | 10 % | 100 % | 10 % |
| Certificación P7 | 8 % | 87,5 % | 7 % |
| Entrega P8 | 4 % | 25 % | 1 % |
| **Total** | **100 %** | | **96 %** |

78 % tras el recálculo → 86 % tras R1 → **94 % tras R2 local**. Los 8 puntos nuevos cierran preparación de portada (+1,5), Simular (+0,5) y revisión gráfica/accesibilidad local (+6). **4 % estimado restante; 2 pasadas de cierre**: R3 certificación exacta/Reddit/zoom nativo y R4 entrega. El porcentaje sigue midiendo preparación, no publicación ni aprobación final.

R2 pasa **293/293 pruebas Reddit**, incluidas las dos nuevas de estado/foco. Build preview conserva 388 eventos y 4.241 textos narrativos, missing=0. CI de 2b4f5c6 terminó correctamente; no se atribuye ese PASS al SHA posterior de pulido. Registro de R2: [R2-LOCAL-REVIEW.json](R2-LOCAL-REVIEW.json).

Validación local de integración: compilación de motor y preview bilingüe; configuración Devvit con SDK 0.14.7; **291/291 pruebas Reddit**, incluidas las 49 focalizadas (no se suman dos veces); **142/142 pruebas separadas de guardados y UI A19**. Los 81 casos de sesión, Player Actions y autosimulación del lote extendido también finalizaron correctamente, incluido el cierre de una carrera completa. Ese lote anterior contenía una expectativa obsoleta del formulario inglés; la expectativa corregida ya pasa en la suite vigente de 291 casos. No se presenta aquel lote como un PASS global ni se suman sus pruebas solapadas. La revisión R3 instala y comprueba 0.1.7.2 en Reddit privado; véase R3-PRIVATE-CANDIDATE.json. Los flags de certificación de la copia 0.1.7 no se heredan: `completeRegression`, `visualAndLanguageReview` y `redditPlaytest` permanecen en false en la candidata modificada. English se comprueba con `--locale-preview` hasta certificar su propio fingerprint.

## 6. Única autoridad y registro

ROADMAP.md es la cola vigente. COVER-PROGRESS.md y COVER-LOCALIZATION.md apuntan a ella; los documentos anteriores se archivan en history y no vuelven a abrir tareas. El plan entregado al usuario replica esta cola limpia.

Registro de entrega futuro: commit/base/fingerprint, CI, versión Devvit y comunidad/post, idioma, recuperación/continuidad, Daily/analítica preservados, incidencias y reversión. Hasta R4, la portada es candidata sin publicar.

Referencias: fuente local de 0.1.7 indicada arriba; informe DESPLIEGUE-REAL-PENDIENTE y RESULTADO-TESTEO del trabajo de analítica; RESULTADO-IMPLEMENTACION-ES-EN del trabajo de traducción; manifiesto de integración 44/44; [PR #4](https://github.com/capitanps02/elevenfate-reddit/pull/4). Auditoría reproducible de fuentes: [SOURCE-017-AUDIT.json](SOURCE-017-AUDIT.json), con tres fingerprints y diferencias de certificación. La integración se realiza únicamente en la rama candidata; la fuente auditada y la instalación pública se conservan. Solo se actualiza la comunidad privada de pruebas.

### Preparación de publicación, 14-Oct

**96 % estimado; 2/4 cerradas, 2 pendientes.** R3 avanza con build, 317/317 pruebas locales limpias y prueba privada de 0.1.7.2: ES/EN, reanudación, tutorial completo, cancelación, entrada/retorno Daily y exportación; la copia de la carrera es idéntica byte a byte tras la navegación. El sandbox no permite descargar mediante Blob: la candidata usa exportación de texto y copia, sin ampliar permisos. CI verify:reddit pasa; el lote extendido sigue pendiente al registrar esta revisión. Zoom nativo y aceptación/performance restantes mantienen R3 abierta. R4 ya tiene paquete, manifiesto, notas de versión y guía de reversión; entrega pública sigue pendiente. Los dos puntos nuevos son +1 de validación privada y +1 de preparación de entrega, sin cerrar otra pasada ni abrir duplicidades. Véanse [PUBLICATION-PREP.md](PUBLICATION-PREP.md) y [R3-PRIVATE-CANDIDATE.json](R3-PRIVATE-CANDIDATE.json).
