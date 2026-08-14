import { EarthLoader } from "./components/EarthLoader";
import { FtpIcon } from "./components/FtpIcon";
import { SmsIcon } from "./components/SmsIcon";

// Secciones con un ícono propio (en vez del genérico de icons.svg).
// Cada componente recibe una prop `size` (px).
export const ICONOS_PERSONALIZADOS = {
  "datos-sitio": EarthLoader,
  ftp: FtpIcon,
  mensajes: SmsIcon,
};
