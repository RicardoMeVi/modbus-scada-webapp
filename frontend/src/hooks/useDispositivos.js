import { useCallback, useEffect, useRef, useState } from "react";
import { getDispositivos } from "../api";

const REINTENTO_MS = 3000;

// Encapsula el fetch + estados de carga/error que se repiten en todas las
// pantallas del panel (Datos del sitio, SMS, FTP, Fecha/Hora, Alarmas,
// Medidores). El fetch original solo corre una vez al montar: sin
// reintento, un fallo transitorio (backend recién arrancando, hiccup de red
// local) dejaba la pantalla mostrando el error para siempre. Acá se
// reintenta solo cada REINTENTO_MS hasta conseguir datos, sin que el
// usuario tenga que hacer nada.
export function useDispositivos() {
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const timerRef = useRef(null);

  const cargar = useCallback(() => {
    setCargando(true);
    getDispositivos()
      .then((datos) => {
        setDispositivos(datos);
        setError(null);
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
    cargar();
    return () => clearTimeout(timerRef.current);
  }, [cargar]);

  return { dispositivos, error, cargando };
}
