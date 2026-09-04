import { useEffect, useState } from "react";

// "conectado" (websocket con el backend local, ver useModbusHub) es casi
// siempre true, aun con el equipo Modbus totalmente desconectado -- no sirve
// solo para saber si hay señal real. Acá se exige además que haya llegado
// alguna lectura real de algún registro configurado, y que sea reciente:
// `lecturas` se acumula y nunca se limpia, así que sin el chequeo de
// antigüedad una lectura vieja de antes de desconectar el equipo seguía
// marcando "conectado" para siempre. El sondeo de fondo es cada 5s (ver
// ModbusPollingService.PollInterval) -- 20s da margen para reintentos sin
// parpadear en falso entre ciclos normales.
const UMBRAL_DATO_RECIENTE_MS = 20_000;

// Compartido entre App.jsx (panel: indicador "En línea"/"Desconectado") y
// PantallaSitio.jsx (splash: tapa el PIN con un loader hasta tener señal
// real, para no rechazar un PIN correcto contra un valor todavía no
// confirmado -- ver comentario en PantallaSitio.jsx).
export function useEquipoConectado(dispositivos, lecturas, conectadoHub) {
  // Sin esto, el chequeo de antigüedad de abajo solo se recalcula cuando
  // llega una lectura nueva por SignalR -- si el equipo se desconecta y deja
  // de mandar lecturas, nada dispara un re-render y la última lectura sigue
  // "pareciendo reciente" para siempre (Date.now() no es reactivo solo).
  // Este tick fuerza un re-render cada 5s para que se vuelva a evaluar
  // aunque no llegue nada nuevo.
  const [, forzarTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forzarTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const hayDatosReales = dispositivos.some((d) =>
    d.registros.some((r) => {
      const lectura = lecturas[r.id];
      if (lectura == null) return false;
      const timestamp = new Date(lectura.timestamp ?? lectura.Timestamp).getTime();
      return Date.now() - timestamp < UMBRAL_DATO_RECIENTE_MS;
    })
  );

  return conectadoHub && hayDatosReales;
}
