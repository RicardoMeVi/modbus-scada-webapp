import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { actualizarConexion, detectarPuerto, getPuertosDisponibles } from "../api";
import { Toast } from "./Toast";
import { IconoSeccion } from "./icons/IconoSeccion";

// Configuración de conexión Modbus RTU del equipo real: solo el puerto COM
// (el equipo real siempre es RTU/RS-485 -- no hay selector Tcp/Rtu, eso
// solo existe para el simulador interno de desarrollo). En vez de pedirle
// al técnico que use Swagger o el Administrador de dispositivos, "Detectar
// automáticamente" prueba cada puerto COM disponible con una lectura Modbus
// real (ver PuertoSerialDetector) y lo selecciona solo. El campo es un
// select real (no un input con sugerencias) -- así el técnico ve de una
// los puertos que Windows tiene conectados ahora mismo, no tiene que
// escribir "COM4" de memoria.
const NOMBRE_PUERTO_VALIDO = /^COM\d+$/i;

export function FichaConexion({ dispositivo }) {
  const { t } = useTranslation();
  // Si lo que quedó guardado no es un nombre de puerto válido (ej. "3COM3",
  // de una detección vieja antes de filtrar esto en el backend), no tiene
  // sentido arrancar el formulario con eso seleccionado -- mejor forzar a
  // elegir uno real.
  const [puertoSerial, setPuertoSerial] = useState(() => {
    const guardado = dispositivo.puertoSerial ?? "";
    return NOMBRE_PUERTO_VALIDO.test(guardado) ? guardado : "";
  });
  const [puertosDisponibles, setPuertosDisponibles] = useState([]);
  const [detectando, setDetectando] = useState(false);
  const [mensajeDeteccion, setMensajeDeteccion] = useState(null); // "encontrado" | "noEncontrado" | null
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null); // "ok" | "error" | null
  const [refrescando, setRefrescando] = useState(false);
  const [mensajeLista, setMensajeLista] = useState(null); // "ok" | "error" | null

  // notificar=true solo para el click manual del botón -- el refresco
  // automático (al montar, o después de "Detectar") no debe mostrar un
  // toast cada vez, solo cuando el técnico pidió explícitamente actualizar
  // y quiere una confirmación de que sí pasó algo.
  function refrescarPuertos({ notificar = false } = {}) {
    setRefrescando(true);
    return getPuertosDisponibles()
      .then((puertos) => {
        setPuertosDisponibles(puertos);
        if (notificar) setMensajeLista("ok");
      })
      .catch(() => {
        if (notificar) setMensajeLista("error");
      })
      .finally(() => setRefrescando(false));
  }

  useEffect(() => {
    refrescarPuertos();
  }, []);

  // El puerto ya guardado puede no estar conectado ahora mismo (equipo
  // apagado, cable suelto) -- se lo deja en la lista igual para no hacerlo
  // "desaparecer" del select y que el guardado previo siga siendo visible.
  const opcionesPuerto =
    puertoSerial && !puertosDisponibles.includes(puertoSerial)
      ? [puertoSerial, ...puertosDisponibles]
      : puertosDisponibles;

  async function detectar() {
    setDetectando(true);
    setMensajeDeteccion(null);
    try {
      const resultado = await detectarPuerto(dispositivo.id);
      if (resultado.encontrado) {
        setPuertoSerial(resultado.puertoSerial);
        setMensajeDeteccion("encontrado");
      } else {
        setMensajeDeteccion("noEncontrado");
      }
    } catch {
      setMensajeDeteccion("noEncontrado");
    } finally {
      setDetectando(false);
      refrescarPuertos();
    }
  }

  async function guardar(e) {
    e.preventDefault();
    if (!puertoSerial) return;
    setGuardando(true);
    try {
      await actualizarConexion(dispositivo.id, {
        nombre: dispositivo.nombre,
        ipAddress: null,
        puerto: 502,
        slaveId: dispositivo.slaveId || 1,
        conexion: 1, // Rtu -- el equipo real nunca usa Tcp
        puertoSerial,
      });
      setEstado("ok");
    } catch {
      setEstado("error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="ficha-sitio" onSubmit={guardar}>
      <div className="ficha-conexion-detectar">
        <button type="button" className="boton-detectar" onClick={detectar} disabled={detectando}>
          {detectando ? t("conexion.detectando") : t("conexion.detectarAutomaticamente")}
        </button>
        {mensajeDeteccion === "encontrado" && (
          <span className="conexion-mensaje ok">{t("conexion.encontrado", { puerto: puertoSerial })}</span>
        )}
        {mensajeDeteccion === "noEncontrado" && (
          <span className="conexion-mensaje mal">{t("conexion.noEncontrado")}</span>
        )}
      </div>

      <div className="ficha-sitio-grid">
        <label>
          {t("conexion.puertoSerial")}
          <div className="campo-conexion-fila">
            <div className="campo-icono campo-conexion-select">
              <span className="icono-campo-izq">
                <IconoSeccion id="enchufe-icon" size={16} />
              </span>
              <select
                value={puertoSerial}
                onChange={(e) => {
                  setEstado(null);
                  setPuertoSerial(e.target.value);
                }}
              >
                <option value="" disabled>
                  {t("conexion.seleccionarPuerto")}
                </option>
                {opcionesPuerto.map((puerto) => (
                  <option key={puerto} value={puerto}>
                    {puerto}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="boton-refrescar"
              onClick={() => refrescarPuertos({ notificar: true })}
              disabled={refrescando}
              aria-label={t("conexion.actualizarLista")}
              title={t("conexion.actualizarLista")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={refrescando ? "girando" : undefined}
              >
                <path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15.36 6.36L3 16M3 21v-5h5" />
              </svg>
            </button>
          </div>
          {puertosDisponibles.length === 0 && (
            <span className="conexion-mensaje mal">{t("conexion.sinPuertos")}</span>
          )}
        </label>
      </div>

      <div className="ficha-sitio-acciones">
        <button type="submit" className="ficha-sitio-guardar" disabled={guardando || !puertoSerial}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {guardando ? t("comun.guardando") : t("comun.guardar")}
        </button>
      </div>

      {estado && (
        <Toast
          tipo={estado}
          mensaje={estado === "ok" ? t("conexion.toastOk") : t("conexion.toastError")}
          onCerrar={() => setEstado(null)}
        />
      )}
      {mensajeLista && (
        <Toast
          tipo={mensajeLista}
          mensaje={mensajeLista === "ok" ? t("conexion.listaActualizada") : t("conexion.listaError")}
          onCerrar={() => setMensajeLista(null)}
        />
      )}
    </form>
  );
}
