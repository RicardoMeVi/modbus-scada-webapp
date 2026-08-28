import { useCallback, useEffect, useRef, useState } from "react";
import { getDispositivos } from "../api";

const REINTENTO_MS = 3000;

// Datos del sitio/SMS/FTP no llegan por SignalR (a diferencia de
// Fecha/Hora) -- son columnas fijas que el backend actualiza cada ~30s
// (ModbusPollingService.CiclosPorLecturaDeSitio) y persiste en la base. Sin
// un refresco periódico acá, la pantalla se congelaba con el snapshot del
// momento en que se abrió, sin enterarse nunca de una lectura más nueva
// (o de que el equipo se desconectó) hasta que el usuario recargara la
// página a mano.
const REFRESCO_MS = 10_000;

// Encapsula el fetch + estados de carga/error que se repiten en todas las
// pantallas del panel (Datos del sitio, SMS, FTP, Fecha/Hora, Alarmas,
// Medidores). El fetch original solo corría una vez al montar: sin
// reintento, un fallo transitorio (backend recién arrancando, hiccup de red
// local) dejaba la pantalla mostrando el error para siempre. Acá se
// reintenta solo cada REINTENTO_MS hasta conseguir datos, y una vez que hay
// datos se refresca cada REFRESCO_MS, sin que el usuario tenga que hacer
// nada.
export function useDispositivos() {
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const timerRef = useRef(null);

  const cargar = useCallback(() => {
    getDispositivos()
      .then((datos) => {
        setDispositivos(datos);
        setError(null);
        timerRef.current = setTimeout(cargar, REFRESCO_MS);
      })
      .catch(() => {
        // Guarda solo un flag (no el texto) para que la pantalla lo
        // traduzca en el idioma vigente al momento de renderizar.
        setError(true);
        timerRef.current = setTimeout(cargar, REINTENTO_MS);
      })
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCargando(true);
    cargar();
    return () => clearTimeout(timerRef.current);
  }, [cargar]);

  return { dispositivos, error, cargando };
}
