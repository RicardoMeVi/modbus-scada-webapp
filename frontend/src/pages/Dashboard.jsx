import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDispositivos } from "../api";
import { traducirNombreRegistro } from "../i18n/registros";
import { EncabezadoPagina } from "../components/EncabezadoPagina";

// Pantalla de bienvenida del Panel de control: resumen del estado del
// sistema y accesos directos a las demás secciones. Es la primera sección
// del sidebar y la que carga por defecto al entrar a /panel.
export function Dashboard({ lecturas, conectado, onNavegar }) {
  const { t } = useTranslation();
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDispositivos()
      .then(setDispositivos)
      .catch(() => setError(t("comun.noSeConectoBackend")));
  }, [t]);

  const dispositivo = dispositivos[0];
  const registrosDestacados = dispositivo?.registros.filter((r) =>
    ["Caudal instantáneo", "Totalizado", "Nivel del tanque", "Bomba"].includes(r.nombre)
  );

  // "conectado" (de useModbusHub) solo dice si el navegador tiene abierto el
  // websocket con ESTE backend local -- eso es casi siempre true, incluso
  // con el equipo Modbus totalmente desenchufado. Lo que de verdad importa
  // para el técnico es si hay lecturas reales entrando; si nunca llegó
  // ninguna, mostramos un aviso con acceso directo a "Conexión" en vez de
  // dejarlo adivinar por qué todo dice "0.00".
  const hayLecturasReales = dispositivo?.registros.some((r) => lecturas[r.id] != null);

  return (
    <div>
      <EncabezadoPagina titulo={t("dashboard.titulo")} dispositivo={dispositivo} />

      {error && <p className="error">{error}</p>}

      {dispositivo && !hayLecturasReales && (
        <div className="banner-sin-conexion">
          <span>{t("dashboard.sinConexionAviso")}</span>
          <button type="button" className="banner-cta" onClick={() => onNavegar("conexion")}>
            {t("dashboard.sinConexionBoton")}
          </button>
        </div>
      )}

      <div className="resumen-grid">
        <div className={`resumen-card ${conectado ? "ok" : "mal"}`}>
          <span className="resumen-label">{t("dashboard.conexionTiempoReal")}</span>
          <span className="resumen-valor">{conectado ? t("comun.enLinea") : t("comun.desconectado")}</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-label">{t("dashboard.sitiosConfigurados")}</span>
          <span className="resumen-valor">{dispositivos.length}</span>
        </div>
        {dispositivo && (
          <div className="resumen-card resumen-card-ancha">
            <span className="resumen-label">{t("dashboard.sitioPrincipal")}</span>
            <span className="resumen-valor resumen-valor-texto">{dispositivo.nombre}</span>
          </div>
        )}
      </div>

      {registrosDestacados && registrosDestacados.length > 0 && (
        <>
          <h3>{t("dashboard.lecturasEnVivo")}</h3>
          <div className="resumen-grid">
            {registrosDestacados.map((registro) => {
              const lectura = lecturas[registro.id];
              const valor = lectura?.valor;
              const texto =
                registro.nombre === "Bomba"
                  ? valor === 1
                    ? t("dashboard.encendido")
                    : t("dashboard.apagado")
                  : `${(valor ?? 0).toFixed(2)} ${registro.unidad ?? ""}`.trim();
              return (
                <div key={registro.id} className="resumen-card">
                  <span className="resumen-label">{traducirNombreRegistro(t, registro.nombre)}</span>
                  <span className="resumen-valor">{texto}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
