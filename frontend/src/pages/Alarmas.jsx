import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispositivos } from "../hooks/useDispositivos";
import { getAlarmas } from "../api";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";

// Claves de la pantalla "Estados / Alarmas" del HMI físico (Kinco/ICH). Ver
// especificación del Interrogador portátil, sección 5: todas comparten el
// registro Modbus 15 (bits 0-4) salvo IHM (registro 29, bit 0) — resueltas
// por el backend en GET /api/dispositivos/{id}/alarmas, no acá.
const CLAVES_ALARMAS = [
  { clave: "alimentacion", icono: "enchufe-icon" },
  { clave: "bateria", icono: "bateria-icon" },
  { clave: "comunicacionTxCaudal", icono: "enlace-icon" },
  { clave: "gsmConectado", icono: "antena-icon" },
  { clave: "gprsConectado", icono: "senal-icon" },
  { clave: "ihm", icono: "chip-icon" },
];

const CLAVE_TEXTO_ESTADO = { ok: "comun.conectado", mal: "comun.estadoDesconectado", neutral: "comun.sinDato" };

// "neutral" ahora es el estado de carga/error (todavía no llegó respuesta
// del backend), no un LED apagado permanente como en la versión anterior
// con datos fijos.
function estadoDesde(alarmas, clave) {
  if (!alarmas) {
    return "neutral";
  }
  return alarmas[clave] ? "mal" : "ok";
}

export function Alarmas() {
  const { t } = useTranslation();
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>{t("alarmas.titulo")}</h2>

      {cargando && <p className="pendiente">{t("comun.cargando")}</p>}
      {error && (
        <p className="error">
          {t("comun.noSeConectoBackend")} {t("comun.reintentando")}
        </p>
      )}
      {!cargando && !error && dispositivos.length === 0 && (
        <p className="pendiente">{t("comun.noHayDispositivos")}</p>
      )}

      <div className="dispositivos">
        {dispositivos.map((dispositivo) => (
          <TarjetaAlarmas key={dispositivo.id} dispositivo={dispositivo} />
        ))}
      </div>
    </div>
  );
}

function TarjetaAlarmas({ dispositivo }) {
  const { t } = useTranslation();
  const [alarmas, setAlarmas] = useState(null);

  useEffect(() => {
    let cancelado = false;

    getAlarmas(dispositivo.id)
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
  }, [dispositivo.id]);

  return (
    <div className="card">
      <div className="card-header">
        <CardTextura />
        <div className="icono-tarjeta">
          <IconoSeccion id="alarm-icon" size={24} />
        </div>
        <div>
          <h3>{dispositivo.nombre}</h3>
          <InsigniaDispositivo dispositivo={dispositivo} />
        </div>
      </div>

      <div className="card-body">
        <div className="estado-tarjetas">
          {CLAVES_ALARMAS.map(({ clave, icono }) => {
            const estado = estadoDesde(alarmas, clave);
            return (
              <div key={clave} className={`estado-tarjeta ${estado}`}>
                <div className="estado-tarjeta-icono">
                  <IconoSeccion id={icono} size={19} />
                </div>
                <div className="estado-tarjeta-texto">
                  <span className="estado-tarjeta-label">{t(`alarmas.${clave}`)}</span>
                  <span className="estado-tarjeta-sub">{t("comun.estadoConexion")}</span>
                  <span className="estado-tarjeta-pill">
                    <span className="estado-dot" /> {t(CLAVE_TEXTO_ESTADO[estado])}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
