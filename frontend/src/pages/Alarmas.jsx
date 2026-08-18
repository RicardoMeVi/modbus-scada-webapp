import { useTranslation } from "react-i18next";
import { useDispositivos } from "../hooks/useDispositivos";
import { useAlarmas } from "../hooks/useAlarmas";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";
import { EstadoTarjeta } from "../components/EstadoTarjeta";

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
  const alarmas = useAlarmas(dispositivo.id);

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
          {CLAVES_ALARMAS.map(({ clave, icono }) => (
            <EstadoTarjeta key={clave} clave={clave} icono={icono} alarmas={alarmas} label={t(`alarmas.${clave}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
