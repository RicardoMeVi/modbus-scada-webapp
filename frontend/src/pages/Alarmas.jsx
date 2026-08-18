import { useTranslation } from "react-i18next";
import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";

// Estados de las alarmas/LEDs de la pantalla "Estados / Alarmas" del HMI
// físico (Kinco/ICH). Ver CONTEXTONuevo.md, sección 3.5: todas comparten el
// registro Modbus 15 (bits 0-4) salvo IHM (registro 29, bit 0) — de solo
// lectura, igual que GSM/GPRS/IHM ya mostrados en Mensaje (SMS) y FTP.
// "neutral" es el LED rosa pálido/apagado que se ve en la unidad de pruebas
// para las alarmas que todavía no tienen sensor conectado.
const ALARMAS = [
  { clave: "alimentacion", estado: "neutral", icono: "enchufe-icon" },
  { clave: "bateria", estado: "ok", icono: "bateria-icon" },
  { clave: "comunicacionTxCaudal", estado: "neutral", icono: "enlace-icon" },
  { clave: "gsmConectado", estado: "mal", icono: "antena-icon" },
  { clave: "gprsConectado", estado: "mal", icono: "senal-icon" },
  { clave: "ihm", estado: "ok", icono: "chip-icon" },
];

const CLAVE_TEXTO_ESTADO = { ok: "comun.conectado", mal: "comun.estadoDesconectado", neutral: "comun.sinDato" };

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
          <div key={dispositivo.id} className="card">
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
                {ALARMAS.map((alarma) => (
                  <div key={alarma.clave} className={`estado-tarjeta ${alarma.estado}`}>
                    <div className="estado-tarjeta-icono">
                      <IconoSeccion id={alarma.icono} size={19} />
                    </div>
                    <div className="estado-tarjeta-texto">
                      <span className="estado-tarjeta-label">{t(`alarmas.${alarma.clave}`)}</span>
                      <span className="estado-tarjeta-sub">{t("comun.estadoConexion")}</span>
                      <span className="estado-tarjeta-pill">
                        <span className="estado-dot" /> {t(CLAVE_TEXTO_ESTADO[alarma.estado])}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
