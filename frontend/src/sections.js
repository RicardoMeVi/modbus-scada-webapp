// Estructura de navegación inicial del dashboard, inspirada en el menú
// principal del HMI Kinco actual (ver CONTEXTO.md, sección 3). Cada sección
// se detalla una a la vez en conversaciones futuras; por ahora solo existe
// el esqueleto de navegación.
export const SECCIONES = [
  { id: "datos-sitio", label: "Datos del sitio", icon: "site-icon" },
  { id: "mensajes", label: "Mensaje (SMS)", icon: "message-icon" },
  { id: "ftp", label: "FTP", icon: "ftp-icon" },
  { id: "fecha-hora", label: "Fecha / Hora", icon: "clock-icon" },
  { id: "alarmas", label: "Alarmas", icon: "alarm-icon" },
];
