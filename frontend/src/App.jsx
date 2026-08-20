import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useModbusHub } from "./hooks/useModbusHub";
import { useDispositivos } from "./hooks/useDispositivos";
import { Sidebar } from "./components/layout/Sidebar";
import { TopbarLines } from "./components/layout/TopbarLines";
import { BotonTema } from "./components/layout/BotonTema";
import { SelectorIdioma } from "./components/layout/SelectorIdioma";
import { Dashboard } from "./pages/Dashboard";
import { DatosDelSitio } from "./pages/DatosDelSitio";
import { Conexion } from "./pages/Conexion";
import { Medidores } from "./pages/Medidores";
import { Mensajes } from "./pages/Mensajes";
import { Ftp } from "./pages/Ftp";
import { FechaHora } from "./pages/FechaHora";
import { Alarmas } from "./pages/Alarmas";
import { SeccionPendiente } from "./pages/SeccionPendiente";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SECCIONES } from "./config/sections";
import logo from "./assets/Logo.png";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [seccionActiva, setSeccionActiva] = useState(SECCIONES[0].id);
  const { lecturas, conectado } = useModbusHub();
  const { dispositivos } = useDispositivos();
  const seccion = SECCIONES.find((s) => s.id === seccionActiva);

  // "conectado" (websocket con el backend local) es casi siempre true, aun
  // con el equipo Modbus totalmente desconectado -- no sirve para el
  // indicador que ve el técnico. Acá se exige además que haya llegado
  // alguna lectura real de algún registro configurado.
  const hayDatosReales = dispositivos.some((d) => d.registros.some((r) => lecturas[r.id] != null));
  const equipoConectado = conectado && hayDatosReales;

  return (
    <div className="app">
      <header className="topbar">
        <TopbarLines />
        <div className="topbar-izquierda">
          <Link to="/" className="boton-volver-sitio" aria-label={t("comun.volverSitio")}>
            {t("comun.volverSitio")}
          </Link>
          <div className="brand">
            <img src={logo} alt="ICH" className="brand-mark" />
            <div className="brand-text">
              <span className="brand-nombre">ICH</span>
              <h1>{t("comun.panelControl")}</h1>
            </div>
          </div>
        </div>
        <div className="acciones-topbar">
          <SelectorIdioma />
          <BotonTema />
          <span className={`estado-pill ${equipoConectado ? "en-linea" : "desconectado"}`}>
            <span className="estado-dot" />
            {equipoConectado ? t("comun.enLinea") : t("comun.desconectado")}
          </span>
        </div>
      </header>

      <div className="layout">
        <Sidebar activo={seccionActiva} onSeleccionar={setSeccionActiva} />

        <main className="contenido">
          {/* key=seccionActiva: si una sección se rompió y quedó con el
              boundary activado, cambiar de sección arranca un boundary
              nuevo en vez de arrastrar el error a la siguiente pantalla. */}
          <ErrorBoundary key={seccionActiva}>
            {seccionActiva === "dashboard" && (
              <Dashboard lecturas={lecturas} conectado={equipoConectado} onNavegar={setSeccionActiva} />
            )}
            {seccionActiva === "datos-sitio" && <DatosDelSitio />}
            {seccionActiva === "conexion" && <Conexion />}
            {seccionActiva === "medidores" && <Medidores lecturas={lecturas} />}
            {seccionActiva === "mensajes" && <Mensajes />}
            {seccionActiva === "ftp" && <Ftp />}
            {seccionActiva === "fecha-hora" && <FechaHora lecturas={lecturas} />}
            {seccionActiva === "alarmas" && <Alarmas />}
            {!["dashboard", "datos-sitio", "conexion", "medidores", "mensajes", "ftp", "fecha-hora", "alarmas"].includes(seccionActiva) && (
              <SeccionPendiente id={seccion?.id} titulo={seccion ? t(seccion.labelKey) : ""} icono={seccion?.icon} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
