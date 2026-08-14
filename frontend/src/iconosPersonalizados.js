import { EarthLoader } from "./components/EarthLoader";
import { FtpIcon } from "./components/FtpIcon";
import { SmsIcon } from "./components/SmsIcon";
import { CalendarIcon } from "./components/CalendarIcon";
import { CheckIcon } from "./components/CheckIcon";

// Secciones con un ícono propio (en vez del genérico de icons.svg).
// Cada componente recibe una prop `size` (px).
export const ICONOS_PERSONALIZADOS = {
  "datos-sitio": EarthLoader,
  ftp: FtpIcon,
  mensajes: SmsIcon,
  "fecha-hora": CalendarIcon,
  alarmas: CheckIcon,
};
