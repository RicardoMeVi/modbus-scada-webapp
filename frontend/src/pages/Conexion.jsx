import { useTranslation } from "react-i18next";
import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { CardTextura } from "../components/layout/CardTextura";
import { FichaConexion } from "../components/FichaConexion";
import { EncabezadoPagina } from "../components/EncabezadoPagina";

// Configuración de conexión Modbus RTU (puerto COM). Sección propia, aparte
// de "Datos del sitio" -- no es un dato de identidad del sitio, es
// configuración técnica que ni existía en el HMI físico (el Kinco tenía un
// solo cable fijo, nunca necesitó elegir puerto).
export function Conexion() {
  const { t } = useTranslation();
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <EncabezadoPagina titulo={t("conexion.titulo")} dispositivo={dispositivos[0]} />

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
                <IconoSeccion id="enchufe-icon" size={24} />
              </div>
              <div>
                <h3>{dispositivo.nombre}</h3>
              </div>
            </div>

            <div className="card-body">
              <FichaConexion dispositivo={dispositivo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
