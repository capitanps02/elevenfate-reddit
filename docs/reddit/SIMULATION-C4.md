# ElevenFate · C4 · Simulación en una pantalla

18 de octubre de 2026. **Ajuste implementado e integrado al 100 %. Plan global: 95 %**, una pasada física pendiente.

La simulación conserva en una sola vista el retrato, nombre, club, forma/físico/fatiga, fecha, acción principal, clasificación resumida, último resultado y próximo rival. El retrato se adapta al espacio disponible. Los márgenes y títulos se compactan; en horizontal la identidad, la acción y los partidos se distribuyen en columnas. No se ocultan datos para conseguir que quepan. Los controles mantienen al menos 44 px; con texto ampliado se permite desplazamiento de respaldo.

Validación: 90 combinaciones de cinco estados (inicio, carrera avanzada, simulación, pausa y epílogo), nueve tamaños y español/inglés, más nueve comprobaciones de nombre largo. Cero desplazamiento y cero elementos recortados. Tamaños: 320×568, 375×500, 390×596, 390×844, 844×390, 740×360, 600×320, 900×600 y 1280×800. 335/335 pruebas de Reddit/interfaz aprobadas. El motor conserva sus archivos idénticos a C3; se reutiliza su evidencia de 177 pruebas de sesiones y guardados, sin presentarla como una nueva ejecución.

Candidata privada **0.1.8.2**, comprobada dentro de Reddit en Mobile y Desktop: cero desplazamiento del contenido. La exportación de carrera conserva exactamente sus bytes tras actualizar. La instalación pública continúa en 0.1.8. No se ha iniciado un Daily competitivo ni avanzado la carrera para esta comprobación.

Las capturas C4 son la referencia vigente de simulación y sustituyen las correspondientes vistas de inicio/simulación de C2/C3. El PDF C2 se conserva como referencia histórica del resto del diseño; no se afirma que sus capturas antiguas de simulación coincidan con C4. El catálogo local y el juego usan el mismo componente y los mismos estilos.

El paquete contiene código, compilación normal, capturas locales y de Reddit, pruebas, certificado y manifiesto SHA-256. Ejecutar `python3 verificar.py` para contrastarlos. El identificador de las 99 comprobaciones coincide con el de la instalación privada. Los gates de publicación siguen rechazando vistas previas, QA o bytes alterados.

Pendiente: revisión de esta versión en móvil físico, teclado y texto ampliado. Cinco de seis pasadas cerradas; global 95 %. Los porcentajes del diseño y de preparación para publicar tienen alcances diferentes.

Build: `EF-C3-5a53a68679d19489`. Fuente: `117d07f4cde5996cb48cbf10d6f6d54b3ff1f5af6b8cf33e6a06975c3dc76e27`.
