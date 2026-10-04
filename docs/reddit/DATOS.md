# Datos y partidas

ElevenFate almacena el identificador de usuario proporcionado por Reddit y los datos de su carrera: nombre del personaje, progreso, decisiones y estado del juego. El identificador permite recuperar la partida de la misma cuenta. El juego no solicita la contraseña de Reddit.

Redis de Devvit conserva una partida activa y una copia anterior dentro de la instalación de la comunidad. Puede existir una caché de datos confirmados en el navegador, que no reemplaza automáticamente los datos del servidor.

Tu partida permite exportar y eliminar la carrera activa y su copia anterior. Tras eliminarlas queda un contador de revisión sin contenido de carrera, para impedir que una pestaña antigua vuelva a subir los datos borrados. Las exportaciones descargadas quedan bajo control del jugador. El almacenamiento está sujeto también a la operación y políticas de Reddit.

Esta primera integración no incorpora anuncios, compras, cookies publicitarias ni envío de partidas a un servidor externo. Actualizar esta descripción antes de incorporar analíticas propias o nuevas funciones que traten datos.

La vista previa local usa una cuenta simulada y memoria; no representa el almacenamiento real de Reddit.

Daily y práctica conservan intentos separados por cuenta, día UTC y versión de reglas. Los intentos escritos desde la versión 0.0.3 caducan siete días después del cambio de día; la carrera libre no recibe esta caducidad. El Daily iniciado en versiones anteriores recibe la caducidad en su próxima escritura.

Al completar el Daily, el resultado confirmado entra automáticamente en el ranking del día de esta comunidad. Se puede consultar sin empezar el intento. El servidor guarda identificador de cuenta y puntuación confirmada para evitar entradas duplicadas; la clasificación muestra posiciones, puntos y la propia entrada, sin nombres ni identificadores públicos. El ranking caduca ocho días después de su último registro. La práctica nunca publica resultados en la clasificación.
