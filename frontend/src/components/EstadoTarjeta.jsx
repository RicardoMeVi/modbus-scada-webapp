import { useTranslation } from "react-i18next";
import { IconoSeccion } from "./icons/IconoSeccion";
import { estadoAlarma, CLAVE_TEXTO_ESTADO } from "../hooks/useAlarmas";

// Una tarjeta de estado (ok/mal/sin dato) para una alarma puntual --
// compartida entre Alarmas, SMS y FTP para que las tres muestren
// exactamente lo mismo, ya que las tres leen del mismo GET .../alarmas.
export function EstadoTarjeta({ label, icono, alarmas, clave }) {
  const { t } = useTranslation();
  const estado = estadoAlarma(alarmas, clave);

  return (
    <div className={`estado-tarjeta ${estado}`}>
      <div className="estado-tarjeta-icono">
        <IconoSeccion id={icono} size={19} />
      </div>
      <div className="estado-tarjeta-texto">
        <span className="estado-tarjeta-label">{label}</span>
        <span className="estado-tarjeta-sub">{t("comun.estadoConexion")}</span>
        <span className="estado-tarjeta-pill">
          <span className="estado-dot" /> {t(CLAVE_TEXTO_ESTADO[estado])}
        </span>
      </div>
    </div>
  );
}
