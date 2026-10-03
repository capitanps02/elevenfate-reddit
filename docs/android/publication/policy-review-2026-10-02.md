# ELEVENFATE — revisión de las declaraciones de Google Play

Fecha: **2 de octubre de 2026**. Artefacto: `ELEVENFATE-0.9.0-internal-v5.aab`, paquete `com.elevenfate.game`, SHA-256 `abe1946be828d86d0a48a9f2a37b3e13bbbdb790b309e432f0ed57139102e7aa`.

**Resultado: no se puede confirmar todavía el cumplimiento de todas las políticas ni certificar las tres declaraciones.** Hay verificaciones técnicas positivas y requisitos pendientes o sin evidencia. Esto no acredita una infracción de cada recurso desconocido; acredita que su cumplimiento no se ha probado. La revisión local tampoco es una aprobación de Google.

## Qué significan las tres casillas

| Declaración de creación | Resultado actual | Qué falta |
| --- | --- | --- |
| Cumplimiento de Políticas del Programa para Desarrolladores | NO CONFIRMADO íntegramente | Derechos de contenido, privacidad, público/IARC y validación del tratamiento de SDK. |
| Términos de Firma de Aplicaciones de Play | Play App Signing activo, tras creación por el titular | Certificado de subida coincidente; no certificación jurídica independiente. |
| Cumplimiento de leyes de exportación de EE. UU. | No certificado | Revisión del titular de obligaciones aplicables, bibliotecas, destinos y restricciones. |

Los [términos de firma](https://play.google/play-app-signing-terms/) permiten a Google gestionar/generar la clave de firma y generar o modificar APK para distribución. La clave de firma gestionada por Google no es la clave de subida local que hemos generado. La aceptación es un acuerdo del titular, no un test que el videojuego pueda aprobar automáticamente.

## Evidencia y pendientes

| Área | Evidencia del juego | Evaluación |
| --- | --- | --- |
| Paquete y funcionalidad | Firma de subida real; bundletool valida estructura; 445 recursos íntegros; siete controles de superficie nativa; decisión, cierres, rotación y reinstalación probados en API36. | Comprobado en ese alcance; no cubre todos los dispositivos. |
| Permisos y seguridad | Manifiesto sin ubicación, contactos, cámara, micrófono ni permisos AD_ID/AdServices en playtest; WebView local HTTPS, CSP sin conexiones del juego y tráfico claro desactivado. | Evidencia positiva; no equivale a auditoría exhaustiva de dependencias. |
| Anuncios del interno | `ADS_ENABLED=false`, diagnóstico false; ninguna carga lista en la sonda. | No solicita anuncios mediante el controlador; conserva SDK AdMob/UMP y `MobileAdsInitProvider`. Pruebas offline no acreditan cero tráfico o cero tratamiento al conectarse. |
| Privacidad | Política pública HTTPS con Pedro Sánchez Miguélez y correo confirmado; texto incluye datos locales, exportaciones y SDK. | Publicación verificada el 2 de octubre; botón/destino HTTPS verificados en AAB v5; URL guardada en Console; revisión pública pendiente. |
| Derechos | AAB contiene **30 vídeos y 8 imágenes**; no encontré un registro de licencias que acredite los 38 recursos. | El titular confirma en el chat que generó los recursos con IA Muse y tiene permiso comercial. Inventario actualizado con esa declaración; no se han adjuntado condiciones/licencias para validación independiente. Vídeos incluyen audio; revisar también personas, equipaciones y marcas. |
| Público y clasificación | Grupos de edad implementados; `audienceAndFamiliesReviewed=false`; sin cuestionario IARC presentado. | «Para todos» no es una clasificación de Google. Revisar contenido y grupos efectivamente apropiados. |
| Monetización comercial | Edad CHILD/TEEN, NPA, rating G, UMP y formatos protegidos implementados. | Falta comprobar mensaje real, consentimiento y retorno/cierre con SDK y release exactos. Flags no sustituyen validación. |
| Compras, comunicación e IA | En lo revisado no hay compras integradas, chat público, generación por prompts ni apuestas con dinero real. Las coincidencias de «apuesta» en textos son decisiones figuradas. | No se observan estas funcionalidades; búsqueda textual no sustituye revisión completa audiovisual o cuestionario. |
| Ficha y país de distribución | Borradores descriptivos sin promesa de multijugador; países/contacto aún sin completar. | Ficha pública pendiente; revisar marcas, información y requisitos de territorios seleccionados. |

### Políticas que sustentan los pendientes

- **Derechos:** Google exige contenido propio o permisos adecuados y puede pedir prueba; incluye imágenes, audio, vídeos y marcas. [Propiedad intelectual](https://support.google.com/googleplay/android-developer/answer/9888072). El inventario contiene hashes del AAB real; no declara licencias inventadas. Un recurso generado con IA también necesita revisar condiciones del proveedor, material de referencia y marcas/personas representadas.
- **Privacidad:** la política exige información del desarrollador/contacto, prácticas de datos, conservación/eliminación y acceso dentro de la app y desde Console. También incluye SDK integrados. [Datos de usuario](https://support.google.com/googleplay/android-developer/answer/10144311). No se ha usado el nombre público de la cuenta como identidad legal del responsable sin confirmarlo.
- **Infancia:** si se incluye a menores, deben ser adecuados contenido, anuncios y tratamiento de datos; público mixto requiere las protecciones correspondientes y edad neutral. [Families](https://support.google.com/googleplay/android-developer/answer/9893335). AdMob `play-services-ads` 19.0.0 o posterior está en la [lista certificada](https://support.google.com/googleplay/android-developer/answer/12955712), pero pertenecer a esa lista no certifica nuestra implementación.
- **Anuncios:** revisar aparición en pausas naturales, cierre real y ausencia de clics inducidos. [Anuncios](https://support.google.com/googleplay/android-developer/answer/9857753). La documentación [AdMob25.5.0](https://developers.google.com/admob/android/privacy/play-data-disclosure) contempla datos del SDK; anuncios no personalizados no son sinónimo de ausencia de datos.
- **Clasificación:** el resultado IARC proviene de respuestas veraces sobre el contenido. No asignamos PEGI/edad por intuición. [Clasificación](https://support.google.com/googleplay/android-developer/answer/9898843).

Google permite empezar una [prueba interna](https://support.google.com/googleplay/android-developer/answer/9845334?hl=es) con configuración incompleta y exime a ese canal del formulario Data Safety. Esto **no acredita cumplimiento universal**, derechos de contenido ni autorización legal, y no convierte esa build en lista para producción.

## Exportaciones: alcance de la revisión

El código de partida usa SHA-256 para integridad y las APIs de plataforma para el origen seguro; no encontré un cifrado propio diseñado por el juego en los archivos revisados. Hay dependencias y conexiones potenciales de SDK que no se pueden excluir solo con ese dato. BIS distingue [firma/integridad y otras funciones de la criptografía de confidencialidad](https://www.bis.gov/learn-support/encryption-controls/cryptography-for-data-confidentiality); esa distinción no acredita automáticamente todas las obligaciones del titular o todos los destinos. No se determina aquí una clasificación ECCN ni se afirma que haga falta un permiso concreto. La [ayuda de Google sobre exportaciones](https://support.google.com/googleplay/android-developer/answer/113770?hl=es) se ha podido leer en el navegador el 2 de octubre: el alojamiento en servidores de EE. UU. puede implicar exportación; invocar criptografía de otras bibliotecas también puede ser relevante y los requisitos dependen de la categoría. Google bloquea descargas a países embargados, pero deja al titular determinar los requisitos aplicables. No se certifica automáticamente la casilla a partir de SHA-256 o de que la app sea un juego.

## Trabajo para cerrar la revisión

1. El titular ya confirma permiso comercial y generación con IA Muse de los recursos consultados. `INVENTARIO-DERECHOS.csv` registra esa declaración para los 38 recursos. Conservar condiciones/documentación del permiso comercial y revisar marcas/personas; sustituir cualquier elemento que no esté cubierto. La generación con IA no certifica por sí sola todos esos derechos.
2. Responsable y correo facilitados; política publicada en https://capitanps02.github.io/Juego-Multihistoria/privacidad/. Integración en AAB v5 verificada; URL ya guardada en Console. Auditar SDK en condiciones conectadas y declaraciones exactas de cada variante.
3. Revisar contenido audiovisual y texto de la carrera, responder público/IARC y finalizar ficha. Probar UMP/formatos protegidos y release antes de monetizar.
4. Resolver la certificación de exportaciones y conservar registro del acuerdo de firma, cuya activación ya se observa en Console.

**Estado del portal:** El AAB v5 está subido, procesado y guardado como borrador de prueba interna. Google muestra 0 errores y 1 advertencia: no hay testers. El titular confirma que todavía no dispone de testers; no se ha añadido nadie ni activado la versión. Paquete com.elevenfate.game, versión 5 (0.9.0-internal), min24/target36, descarga indicada 55,5 MB. Play App Signing activo y certificado de subida coincidente. Política HTTPS guardada en Console. No equivale a aprobación de políticas ni producción. La aplicación ya estaba creada cuando el agente reanudó; no marcó ni envió las declaraciones de creación.

## Confirmación posterior del titular

El 2 de octubre de 2026 el propietario respondió a la pregunta sobre imágenes, vídeos y audio: «tengo permiso para comercializarlo, los genere con la ia muse por lo tanto son de mi propiedad». Se registra como declaración del titular sobre autorización comercial; no como verificación independiente de un contrato ni garantía de cumplimiento global. No se ha supuesto qué proveedor o versión concreta de Muse usó.

## Política publicada con los datos del titular

El titular facilitó Pedro Sánchez Miguélez y pedrosamiguelez@gmail.com como responsable/contacto público. Política publicada en [GitHub Pages](https://capitanps02.github.io/Juego-Multihistoria/privacidad/) el 2 de octubre de 2026: HTTPS 200, HTML idéntico al texto local y pantalla de 390 px sin desbordamiento. El AAB v4 anterior no incluye este enlace. El AAB v5 lo incorpora y su botón real ha emitido el Intent HTTPS esperado durante la prueba nativa offline. La publicación de la política no certifica UMP, Families, IARC, exportaciones ni la aceptación de contratos.

La ejecución v5 aceptada conserva la partida tras tres cierres y rotación/reinstalación, verifica siete superficies nativas y no registra ANR/crash del juego ni ANR de sistema en ese tramo. Se conserva el intento inicial rechazado por ANR de System UI en `attempts/v5-system-ui-startup-anr.json`; no se ha ocultado ni usado como evidencia de aprobado.
