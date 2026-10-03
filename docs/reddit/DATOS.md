# Datos y partidas

ElevenFate almacena el identificador de usuario proporcionado por Reddit y los datos de su carrera: nombre del personaje, progreso, decisiones y estado del juego. El identificador permite recuperar la partida de la misma cuenta. El juego no solicita la contraseña de Reddit.

Redis de Devvit conserva una partida activa y una copia anterior dentro de la instalación de la comunidad. Puede existir una caché de datos confirmados en el navegador, que no reemplaza automáticamente los datos del servidor.

Tu partida permite exportar y eliminar la carrera activa y su copia anterior. Tras eliminarlas queda un contador de revisión sin contenido de carrera, para impedir que una pestaña antigua vuelva a subir los datos borrados. Las exportaciones descargadas quedan bajo control del jugador. El almacenamiento está sujeto también a la operación y políticas de Reddit.

Esta primera integración no incorpora anuncios, compras, cookies publicitarias ni envío de partidas a un servidor externo. Actualizar esta descripción antes de incorporar analíticas propias o nuevas funciones que traten datos.

La vista previa local usa una cuenta simulada y memoria; no representa el almacenamiento real de Reddit.
