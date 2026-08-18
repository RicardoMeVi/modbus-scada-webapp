import { useTranslation } from "react-i18next";
import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";
import { traducirNombreRegistro } from "../i18n/registros";

// Sección "Medidores": Caudal instantáneo y Totalizado, solo lectura.
// Es el caso más simple del mapa de registros real (ver CONTEXTONuevo.md,
// secciones 3.6 y 13) — por eso es la primera sección de detalle en
// implementarse.
const NOMBRES_MEDIDORES = ["Caudal instantáneo", "Totalizado"];

export function Medidores({ lecturas }) {
  const { t } = useTranslation();
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>{t("medidores.titulo")}</h2>

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
        {dispositivos.map((dispositivo) => {
          const registros = dispositivo.registros.filter((r) => NOMBRES_MEDIDORES.includes(r.nombre));
          if (registros.length === 0) return null;

          return (
            <div key={dispositivo.id} className="card">
              <div className="card-header">
                <CardTextura />
                <div className="icono-tarjeta">
                  <IconoSeccion id="medidor-icon" size={24} />
                </div>
                <div>
                  <h3>{dispositivo.nombre}</h3>
                  <InsigniaDispositivo dispositivo={dispositivo} />
                </div>
              </div>

              <div className="card-body">
                <div className="resumen-grid">
                  {registros.map((registro) => {
                    const lectura = lecturas[registro.id];
                    return (
                      <div key={registro.id} className="resumen-card">
                        <span className="resumen-label">{traducirNombreRegistro(t, registro.nombre)}</span>
                        <span className="resumen-valor">
                          {(lectura?.valor ?? 0).toFixed(2)} {registro.unidad}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
