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
// real (ver PuertoSerialDetector) y llena el campo solo. Si no encuentra
// nada, el campo sigue siendo editable a mano, con los puertos que ve
// Windows como sugerencia (datalist).
export function FichaConexion({ dispositivo }) {
  const { t } = useTranslation();
  const [puertoSerial, setPuertoSerial] = useState(dispositivo.puertoSerial ?? "");
  const [puertosDisponibles, setPuertosDisponibles] = useState([]);
  const [detectando, setDetectando] = useState(false);
  const [mensajeDeteccion, setMensajeDeteccion] = useState(null); // "encontrado" | "noEncontrado" | null
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null); // "ok" | "error" | null

  useEffect(() => {
    getPuertosDisponibles()
      .then(setPuertosDisponibles)
      .catch(() => {});
  }, []);

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
      getPuertosDisponibles()
        .then(setPuertosDisponibles)
        .catch(() => {});
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
          <div className="campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="enchufe-icon" size={16} />
            </span>
            <input
              value={puertoSerial}
              list="puertos-disponibles"
              placeholder="COM4"
              onChange={(e) => {
                setEstado(null);
                setPuertoSerial(e.target.value);
              }}
            />
          </div>
          <datalist id="puertos-disponibles">
            {puertosDisponibles.map((puerto) => (
              <option key={puerto} value={puerto} />
            ))}
          </datalist>
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
    </form>
  );
}
