# Portada Reddit — avance de implementación

12 de octubre de 2026. PR #4; código en borrador, no publicado.

## Avance estimado: 53 %; pendiente: 47 %

Es una estimación de trabajo completado, no una certificación funcional ni visual. Los pesos se fijan para no tratar la traducción completa como un pequeño botón. Cada porcentaje de pasada incluye preparación y código; PASS final exige sus gates.

| Pasada | Peso | Avance estimado | Aporte al total | Situación |
|---|---:|---:|---:|---|
| P0 Baseline | 8 % | 75 % | 6 % | Reddit 0.1.6 e Inicio inspeccionados; correspondencia SHA/bundle pendiente |
| P1 Contrato | 10 % | 90 % | 9 % | Especificado; revisión final contra versión publicada pendiente |
| P2 Portada | 15 % | 80 % | 12 % | Menú implementado; validación gráfica pendiente |
| P3 Flujos | 20 % | 85 % | 17 % | Tutorial narrativo y salidas explícitas implementados; atrás nativo pendiente |
| P4 ES/EN | 20 % | 0 % | 0 % | Inglés integral todavía no conectado |
| P5 Simular | 5 % | 80 % | 4 % | Selector ausente en Inicio publicado 0.1.6; candidato pendiente de comparación |
| P6 Arte/a11y | 10 % | 10 % | 1 % | Estilos y targets iniciales; arte final y QA real pendientes |
| P7 Certificación | 8 % | 50 % | 4 % | CI anterior PASS; cambios actuales probados localmente y nueva CI pendiente |
| P8 Reddit real | 4 % | 0 % | 0 % | Sin prueba ni publicación del candidato |

Quedan seis pasadas principales de ejecución: cerrar P3, P4, P5, P6, P7 y P8. También siguen pendientes las comprobaciones de cierre de P0/P1/P2; no se consideran certificadas. No hacen falta nuevas pasadas inventadas para esos controles: se cierran dentro de las existentes.

## Cambio de esta iteración
Nueva partida tiene una vista enfocada, nombre dinámico y código de historia bajo opciones avanzadas. Reutiliza el mismo flujo de creación que Tu partida. La primera carrera no pide confirmación de sobrescritura; una carrera existente sí. El formulario conserva lo escrito si falla la creación y rechaza el código vacío.

Pruebas locales: 14/14 PASS de entrada/portada y formulario con DOM simulado, sin validación de layout. CI completa anterior 2479621af694e44dd4c8cd67da58e0b404c28e8e: PASS (build, Reddit, guardado, sesión e interfaz). Cambios de esta iteración requieren nueva CI. El navegador local no está instalado; no afirmar screenshots ni revisión visual.

## Continuación: tutorial y acceso Reddit
Tutorial con La lista de 26, tres choices por ID y resultados primarios como ejemplos explícitos. Muestra de presentación sin engine, RNG, Redis ni intento Daily. Saltar entra en modo apropiado solo con disponibilidad confirmada; Escape vuelve al menú y limpia su listener. 21/21 pruebas locales PASS.

La CI de 3068975e86d563a6323743bd3cd268c6a3ce107d pasó 46 pruebas Reddit y 177 de sesión/guardado, pero falló 1/28 comprobaciones de UI por redacción del código de historia. La frase contractual se ha restaurado; requiere nueva CI. El último PASS completo sigue siendo 2479621af694e44dd4c8cd67da58e0b404c28e8e.
