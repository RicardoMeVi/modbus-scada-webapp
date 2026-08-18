import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDispositivo, getDispositivos } from "../api";
import { useModbusHub } from "../hooks/useModbusHub";
import { ModalVerificacion } from "../components/ModalVerificacion";
import { BotonTema } from "../components/layout/BotonTema";
import { SelectorIdioma } from "../components/layout/SelectorIdioma";
import logo from "../assets/Logo.png";
import "./PantallaSitio.css";

// Pantalla completa que replica la vista "UTD ICH PSI" del panel HMI
// físico (Kinco/ICH): logo, Caudal instantáneo, Totalizado y la Unidad de
// Verificación. Es la pantalla de inicio del sistema (igual que en el
// equipo real) y NO tiene navegación visible al Panel de control — se
// entra únicamente validando el PIN de la Unidad de Verificación. Sin
// :dispositivoId en la URL (ruta "/") muestra el primer dispositivo
// configurado; con :dispositivoId (ruta "/sitio/:id") apunta a uno puntual.
const NOMBRES_HERO = ["Caudal instantáneo", "Totalizado"];

export function PantallaSitio() {
  const { t } = useTranslation();
  const { dispositivoId } = useParams();
  const navigate = useNavigate();
  const [dispositivo, setDispositivo] = useState(null);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const { lecturas } = useModbusHub();

  useEffect(() => {
    if (dispositivoId) {
      getDispositivo(dispositivoId)
        .then(setDispositivo)
        .catch(() => setError(t("pantallaSitio.noSeCargoSitio")));
      return;
    }

    getDispositivos()
      .then((lista) => {
        if (lista.length === 0) {
          setError(t("pantallaSitio.sinDispositivos"));
        } else {
          setDispositivo(lista[0]);
        }
      })
      .catch(() => setError(t("pantallaSitio.noSeCargoSitio")));
  }, [dispositivoId, t]);

  const registrosHero = dispositivo?.registros.filter((r) => NOMBRES_HERO.includes(r.nombre)) ?? [];

  return (
    <div className="pantalla-sitio">
      <div className="pantalla-sitio-verificacion">
        <div className="acciones-topbar">
          <SelectorIdioma />
          <BotonTema />
        </div>
        <span className="etiqueta-verificacion">{t("pantallaSitio.unidadVerificacion")}</span>
        <button className="boton-skew" onClick={() => setModalAbierto(true)}>
          <span>{t("pantallaSitio.ingresar")}</span>
        </button>
      </div>

      <div className="pantalla-sitio-header">
        <img src={logo} alt="ICH" className="brand-mark" />
        <div className="pantalla-sitio-marca">
          <span className="brand-nombre">ICH</span>
          <h1>{dispositivo?.nombre ?? t("pantallaSitio.cargando")}</h1>
        </div>
      </div>

      {error && <p className="pantalla-sitio-error">{error}</p>}

      <div className="pantalla-sitio-stats">
        {registrosHero.map((registro) => {
          const lectura = lecturas[registro.id];
          return (
            <div key={registro.id} className="stat-tile">
              <span className="stat-label">{registro.nombre}</span>
              <span className="stat-valor">
                {(lectura?.valor ?? 0).toFixed(2)}
                <small>{registro.unidad}</small>
              </span>
            </div>
          );
        })}
      </div>

      {modalAbierto && (
        <ModalVerificacion
          onClose={() => setModalAbierto(false)}
          onSuccess={() => navigate("/panel")}
        />
      )}
    </div>
  );
}
