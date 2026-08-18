import { useEffect, useState } from "react";
import { getAlarmas } from "../api";

// Compartido entre Alarmas (las 6) y las tarjetas de GSM/GPRS/IHM que
// aparecen también en SMS y FTP -- las tres pantallas deben decir lo mismo,
// porque son la misma fuente de datos (GET .../alarmas).
export function useAlarmas(dispositivoId) {
  const [alarmas, setAlarmas] = useState(null);

  useEffect(() => {
    if (!dispositivoId) {
      return;
    }

    let cancelado = false;

    getAlarmas(dispositivoId)
      .then((datos) => {
        if (!cancelado) {
          setAlarmas(datos);
        }
      })
      .catch(() => {
        if (!cancelado) {
          setAlarmas(null);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [dispositivoId]);

  return alarmas;
}

// "neutral" es tanto "todavía no llegó respuesta del backend" como "el
// backend respondió pero esta alarma en particular no tiene ninguna lectura
// todavía" (equipo recién configurado o inalcanzable) -- el backend manda
// null en ese segundo caso, y hay que distinguirlo de bit=0 (todo bien): de
// lo contrario "sin dato" y "sin alarma" se ven idénticos (los dos verdes).
export function estadoAlarma(alarmas, clave) {
  const valor = alarmas?.[clave];
  if (valor === null || valor === undefined) {
    return "neutral";
  }
  return valor ? "mal" : "ok";
}

export const CLAVE_TEXTO_ESTADO = { ok: "comun.conectado", mal: "comun.estadoDesconectado", neutral: "comun.sinDato" };
