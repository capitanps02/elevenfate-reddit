# C2 - Pulido integrado en el juego

> Registro histórico de C2. Continuación: [candidata C3](PUBLICATION-C3.md), interfaz 100 % integrada y plan global 95 %; privada 0.1.8.1 comprobada.

18 de octubre de 2026. Base bad9858; rama feat/reddit-cover-entry-20261012.

Estado: **85 % del plan de interfaz C2; 5/6 pasadas cerradas; 1 pasada de destino restante**. El cierre de la versión publicada 0.1.8 es un trabajo distinto; C2 no se ha instalado ni publicado en Reddit.

Implementado en la rama local: tema deportivo y fuentes locales; receta de renderizado compartida; consecuencia sin caja ni banda; desplazamiento conjunto de historia y opciones en pantallas cortas; menú oculto durante decisiones inmersivas en todos los tamaños; formulario de creación centrado; selector de idioma de ayuda en su propia fila; alertas dentro del contenido para no cubrir recuperación; márgenes seguros y nombres largos.

Validación: 318/318 pruebas Reddit/UI; 56 vistas a cuatro tamaños (224 comprobaciones); ocho vistas en inglés de vista previa; entrada normal del juego y catálogo con medidas y tipografías iguales. Datos locales de prueba. No se afirma prueba en dispositivo físico ni Reddit privado para C2.

Pendiente: T16 probar en Reddit privado, T17 comprobar dispositivos físicos/accesibilidad de destino, T18 cerrar regresión y sellar esa candidata de destino. El plan editable de esta entrega conserva los pesos de las 18 tareas.

El diff queda local y revisable. El paquete incluye la copia completa del código, un parche de presentación, fuentes con licencias, el catálogo y el verificador. Los binarios de las fuentes están en codigo/web/assets/fonts y no en el parche textual. El motor src no se modifica.
