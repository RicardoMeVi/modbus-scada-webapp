import { useTranslation } from "react-i18next";
import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";
import { FichaSitio } from "../components/FichaSitio";

// Identificación del sitio, igual a la pantalla "Datos del sitio" del HMI
// físico (Kinco/ICH): NSM, NSUE, NSUT, RFC, Unidad de verificación,
// Contraseña UTD y coordenadas. No incluye lecturas Modbus en vivo — esas
// viven en el Dashboard y en la pantalla completa del sitio.
export function DatosDelSitio() {
  const { t } = useTranslation();
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>{t("datosSitio.titulo")}</h2>

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
                <IconoSeccion id="site-icon" size={24} />
              </div>
              <div>
                <h3>{dispositivo.nombre}</h3>
                <InsigniaDispositivo dispositivo={dispositivo} />
              </div>
            </div>

            <div className="card-body">
              <FichaSitio dispositivo={dispositivo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
