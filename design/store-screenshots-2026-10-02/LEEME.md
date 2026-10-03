# Capturas promocionales de ELEVENFATE

Cuatro imágenes verticales RGB sin transparencia de 1080 × 1920, preparadas para sustituir las capturas iniciales de la ficha española. Son composiciones estilizadas con IA sobre pantallas reales de la v6, revisadas visualmente frente a sus originales.

1. **Minuto 89. Tú decides.** Una decisión deportiva con tres opciones.
2. **¿Dar el salto o quedarte?** Una decisión de mercado con cuatro opciones.
3. **Una carrera que evoluciona.** Temporadas y resultados reales de una carrera de demostración.
4. **Tu entorno también cuenta.** Personas registradas en esa carrera.

Herramienta: `image_gen` integrada. Los cuatro prompts completos están en `prompt-1.txt` a `prompt-4.txt`; fuentes y hashes en `CAPTURAS-PROMO.json`. Las capturas nativas se conservan en `originales/` y `originales-480/`. Los archivos finales son `01-decision.png`, `02-mercado.png`, `03-carrera.png` y `04-relaciones.png`.

La prueba de captura no modifica el AAB de producción ni la mecánica del juego. El emulador se usa exclusivamente para QA y la partida anterior se restaura al finalizar. Esta carpeta contiene material de tienda; las pruebas de funcionamiento anteriores siguen conservando sus capturas nativas sin retoques.

Guía consultada: https://support.google.com/googleplay/android-developer/answer/9866151?hl=es — interfaz prioritaria, titulares breves, sin llamadas a descargar, premios o funciones inventadas.
