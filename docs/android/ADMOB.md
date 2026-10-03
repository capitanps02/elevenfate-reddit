# AdMob de ELEVENFATE

Aplicación Android no publicada, registrada el 1 de octubre de 2026.

| Recurso | Identificador |
|---|---|
| App ID | `ca-app-pub-5885997776515515~2515297288` |
| Intersticial tras resultados | `ca-app-pub-5885997776515515/1379233022` |
| Banner protegido | `ca-app-pub-5885997776515515/7734381673` |
| Recompensado reservado | `ca-app-pub-5885997776515515/3813824678` |

[Aplicación en AdMob](https://admob.google.com/v2/apps/2515297288/overview). Los identificadores anteriores son públicos. `android/release.properties` está ignorado por Git y contiene la configuración local de producción incompleta. Los APK debug/QA utilizan exclusivamente los IDs oficiales de prueba; los identificadores reales no activan publicidad comercial en esos APK.

El bloque recompensado está reservado. Conserva la configuración inicial de recompensa de AdMob y no se usa en producción hasta definir y persistir el beneficio del juego.

Pendiente: política HTTPS, publicar mensajes UMP, vincular ficha Play, revisión de la aplicación, verificar dominio/app-ads.txt y completar lo que AdMob solicite sobre cuenta/pagos. Crear los bloques no equivale a tener monetización aprobada.

Actualización de público: anuncios habilitados para todas las edades. SDK `com.google.android.gms:play-services-ads:25.5.0`, incluido por Google en su lista Families (19.0.0 o posteriores). Menores de16/edad desconocida: tratamiento CHILD y banner cerrable inmediatamente, máximo20s. 16–17 y selección antigua16+: TEEN;18+: UNSPECIFIED. Todas las solicitudes incluyen `npa=1` y contenido máximo G. UMP sigue siendo obligatorio cuando corresponda.

Frecuencia compartida entre formatos:8min activos antes del primero,6 resultados desde el inicio/último anuncio,8min activos entre anuncios y máximo2 por sesión de actividad. El diagnóstico manual de QA permite saltar los tiempos para probar la integración. El banner real se creó sin vídeo y con renovación automática inhabilitada.

Fuentes: [SDKs admitidos para Families](https://support.google.com/googleplay/android-developer/answer/12955712), [tratamiento por edad](https://developers.google.com/admob/android/targeting), [requisitos de formato](https://support.google.com/googleplay/android-developer/answer/9893335).
