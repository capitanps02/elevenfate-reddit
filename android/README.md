# ELEVENFATE para Android

El proyecto conserva GameSession, la interfaz ELEVENFATE y las cinemáticas empaquetadas. Usa WebViewAssetLoader para servir `https://appassets.androidplatform.net/assets/` dentro del APK. El juego no carga red externa; Internet se usa para AdMob y UMP en la capa nativa.

## Abrir en Android Studio en este Mac

1. En Android Studio, pulsa **Open** y selecciona esta carpeta `android`, no la raíz TypeScript.
2. Espera la sincronización de Gradle. Selecciona **JDK 17** como Gradle JDK. Se ha configurado `GRADLE_LOCAL_JAVA_HOME` mediante `.gradle/config.properties`; si Studio pide elegirlo, usa la ruta que figura allí. El JBR 25 de Studio no sirve para este Gradle 8.13.
3. `local.properties` apunta al SDK 36 preparado en el espacio de trabajo. En otro ordenador, cambia esa ruta por tu SDK instalado.
4. Elige la variante **debug** para desarrollo o **qa** para probar R8. Elige tu teléfono o emulador y pulsa Run.
5. Indica el grupo de edad. Todos los grupos pueden recibir publicidad: menores de16/desconocidos con banner protegido,16–17 y18+ con intersticial. La carga depende de UMP y de inventario.
6. En **Tu partida**, las variantes de prueba muestran controles de diagnóstico de anuncios. Son IDs de prueba de Google. No pulses anuncios reales para probar.

La carpeta `.local` contiene la configuración de herramientas de este Mac y la firma debug. Está ignorada por Git. Al usar la CLI sin esa firma, el script la crea. Para Android Studio en una copia nueva, ejecuta primero `npm run android:apk` o configura su firma de depuración.

## Compilar desde la raíz del juego

Requisitos generales: Node compatible con los scripts existentes (esta sesión usa Node 22), TypeScript 5.8.3 mediante `npm ci`, JDK17 y SDK36. Gradle está fijado en el wrapper, no hace falta instalarlo globalmente.

```sh
npm ci
npm run android:apk
npm run android:qa
npm run android:check
```

- `android:apk`: regenera assets y APK debug.
- `android:qa`: regenera assets y produce APK/AAB QA optimizados, firmados con clave de pruebas.
- `android:check`: regenera assets, APK debug, pruebas de política y Lint.
- `test:android:offline`: pruebas de equivalencia y recursos empaquetados.

Los resultados Gradle están en `app/build/outputs/`. Un AAB QA no es un archivo para publicar. El motor sigue en versión 0.8.0; la app Android inicial usa versionName 0.9.0 y versionCode 1.

## Producción

Los IDs reales creados se documentan en `../docs/android/ADMOB.md`. Copia `release.properties.example` a `release.properties` en un ordenador nuevo y completa:

- App ID y bloque intersticial de AdMob.
- URL pública HTTPS de privacidad y revisión de público/Families.
- Ruta/alias/contraseñas de la **clave de subida** de producción.

Después, `npm run android:release` genera un AAB release. El build está bloqueado hasta que exista esa configuración. No se incluyen contraseñas ni claves en Git. El bloque recompensado comercial permanece deshabilitado hasta implementar la recompensa persistente.

Antes de distribuir: seguir el plan y QA; configurar/publicar mensajes UMP; completar Data Safety, IARC, audiencia, derechos de assets y Play App Signing. Consultar `../docs/android/PLAN-INGENIERIA.md`.

## Prueba en emulador dedicado

La sonda actual es `com.multihistoria.AndroidSmokeProbe`. Se compila con `assembleDebugAndroidTest`. Usa una edad protegida en modo avión y comprueba publicidad habilitada con tratamiento CHILD; comprueba carga HTTPS local, UI, controles de JSON/privacidad, atrás Android, decisión real y recuperación tras detener el proceso.

```sh
cd android
./gradlew assembleDebug assembleDebugAndroidTest
cd ..
ANDROID_HOME=/ruta/al/sdk node scripts/test-android-smoke.mjs emulator-5562
```

Solo admite seriales de emulador y exige confirmación de que es el AVD dedicado de ELEVENFATE. No ejecuta `pm clear` ni toca teléfonos. Las sondas históricas P11/T3 siguen como referencia; para compilarlas como runner usa `-PprobeRunner=com.multihistoria.OfflineProbe`. Sus expectativas de la interfaz antigua deben actualizarse antes de volver a usarlas.

La misma prueba se puede ejecutar contra QA con R8:

```sh
cd android
./gradlew -PtestVariant=qa assembleQa assembleQaAndroidTest
cd ..
ANDROID_HOME=/ruta/al/sdk node scripts/test-android-smoke.mjs emulator-5562 --qa
```

La sonda encuentra el WebView en la jerarquía de vistas, sin depender de nombres privados que R8 pueda cambiar. Comprueba además que girar a horizontal conserva el guardado. Los informes `runtime-debug.json` y `runtime-qa.json` registran el hash del APK ejecutado; regenerar un APK requiere una nueva comprobación. La marca de recursos `androidRuntimeVerified` se mantiene en `false`: el resultado de ejecución pertenece al binario concreto del informe, no a la fuente ni a una compilación futura.

Para jugar en este Mac sin teléfono, utiliza el lanzador `../../ABRIR-ELEVENFATE-EMULADOR.command` y la guía `../../PROBAR-ELEVENFATE.md`, conservando el espacio de trabajo completo.

`proguard-qa.pro` conserva los getters de configuración y el enum de edad del SDK que consulta la sonda de tratamiento protegido. La sonda invoca también el callback público de Atrás de AndroidX; esas APIs se conservan en QA. Las reglas de diagnóstico no se aplican a release.

Frecuencia actual:8min activos antes del primero,6 resultados entre anuncios,8min activos de separación y máximo2 por sesión. Menores/desconocidos: banner máximo20s con cierre inmediato. Todas las solicitudes incluyen `npa=1` y filtro G. SDK25.5.0 admitido en Families y UMP4.0.0.

## Primera subida de pruebas internas

La variante `playtest` usa el paquete `com.elevenfate.game`, la clave de subida y R8/shrink de producción, con solicitudes de anuncios y diagnóstico desactivados. Se retiraron sus permisos de identificadores publicitarios. `release` conserva sus controles de privacidad/público/anuncios; no promocionar `playtest` como versión comercial.

Preparar clave con `node scripts/prepare-android-upload-key.mjs` desde el repositorio; no sobrescribe una identidad existente. Construir con `node scripts/build-android-apk.mjs --playtest`. Probar el AAB con `test-android-play-bundle.mjs` sobre emulador dedicado y consultar `docs/android/publication/RUTA-HASTA-GOOGLE-PLAY.md`. La clave y contraseña están ignoradas por Git y no se exportan junto a los artefactos públicos.
