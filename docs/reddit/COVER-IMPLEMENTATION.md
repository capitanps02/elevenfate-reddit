# Reddit portada — primera implementación
Base: 91b6449b6e9dc4226f0b36b35384bc3558a425dc. Rama: feat/reddit-cover-entry-20261012.

## Código entregado
- Portada expandida con Continuar, Nueva partida, Daily y Tutorial en columna y dos idiomas abajo.
- Solo lectura validada para disponibilidad; ningún GameSession.create al abrir portada.
- Entrada explícita a creación mediante Tu partida existente, con validación/confirmación/backup originales.
- mountGame conserva su comportamiento por defecto y añade opciones acotadas para entrada Reddit.
- Auto-simulación guardada no avanza al cargar desde portada: requiere Reanudar explícito.
- Daily vuelve a su origen; la carrera oculta suspende su scheduler. Respuestas de Daily desmontado se ignoran.
- Tutorial interactivo de controles, tres pasos, saltar y funciones bajo detalle optativo. No usa motor ni Redis.

## Pendientes y límites
Esta es una primera entrega técnica, no un PASS final de P0–P8.
El entorno local de ejecución estuvo indisponible. Se comprueba sintaxis/modelo de estado en V8; Node/build/regresión dependen de GitHub Actions y se informan separadamente.
English aparece deshabilitado con explicación: PR #3 aún no conecta carrera/Daily completos. No se ofrece una traducción inglesa parcial como juego localizado.
El tutorial usa demostración neutral de controles, no una escena narrativa ni consecuencias ficticias. La escena canónica verificada sigue pendiente.
Nueva partida reutiliza la pantalla Tu partida completa; formulario enfocado y pulido artístico posteriores pendientes.
No hay selector de idiomas en Simular en el SHA base: nada se elimina por conjetura.
Sin verificación del bundle publicado, prueba visual, dispositivos físicos ni despliegue Devvit.
La portada sigue al splash exigido por entrada actual; no se duplican opciones en ambas superficies.
El motor sigue importado por el entrypoint: montaje diferido no equivale a descargar el motor bajo demanda.
La preferencia persistente ES/EN, cobertura completa y transferencia entre entradas se implementan con la localización completa.
Navegación atrás del contenedor/SDK y revisión visual del botón Portada en header pendientes.
No se fusionan scoring, telemetría o PR de idiomas; no se cambia save schema ni servidor.

## Validación
`pnpm run verify:reddit` incorpora pruebas nuevas de disponibilidad, error, lecturas concurrentes y desmontaje.
La CI existente verifica build y regresión adicional de UI/guardado. Revisar resultados del SHA exacto; no considerar pruebas añadidas como pruebas pasadas.
