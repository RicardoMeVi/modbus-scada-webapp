import { useState } from "react";
import { Link } from "react-router-dom";
import { useModbusHub } from "./hooks/useModbusHub";
import { Sidebar } from "./components/layout/Sidebar";
import { TopbarLines } from "./components/layout/TopbarLines";
import { Dashboard } from "./pages/Dashboard";
import { DatosDelSitio } from "./pages/DatosDelSitio";
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
  const [seccionActiva, setSeccionActiva] = useState(SECCIONES[0].id);
  const { lecturas, conectado } = useModbusHub();
  const seccion = SECCIONES.find((s) => s.id === seccionActiva);

  return (
    <div className="app">
      <header className="topbar">
        <TopbarLines />
        <div className="topbar-izquierda">
          <Link to="/" className="boton-volver-sitio" aria-label="Volver a la pantalla del sitio">
            ← Pantalla del sitio
          </Link>
          <div className="brand">
            <img src={logo} alt="ICH" className="brand-mark" />
            <div className="brand-text">
              <span className="brand-nombre">ICH</span>
              <h1>Panel de control</h1>
            </div>
          </div>
        </div>
        <span className={`estado-pill ${conectado ? "en-linea" : "desconectado"}`}>
          <span className="estado-dot" />
          {conectado ? "En línea" : "Desconectado"}
        </span>
      </header>

      <div className="layout">
        <Sidebar activo={seccionActiva} onSeleccionar={setSeccionActiva} />

        <main className="contenido">
          {/* key=seccionActiva: si una sección se rompió y quedó con el
              boundary activado, cambiar de sección arranca un boundary
              nuevo en vez de arrastrar el error a la siguiente pantalla. */}
          <ErrorBoundary key={seccionActiva}>
            {seccionActiva === "dashboard" && (
              <Dashboard lecturas={lecturas} conectado={conectado} onNavegar={setSeccionActiva} />
            )}
            {seccionActiva === "datos-sitio" && <DatosDelSitio />}
            {seccionActiva === "medidores" && <Medidores lecturas={lecturas} />}
            {seccionActiva === "mensajes" && <Mensajes />}
            {seccionActiva === "ftp" && <Ftp />}
            {seccionActiva === "fecha-hora" && <FechaHora lecturas={lecturas} />}
            {seccionActiva === "alarmas" && <Alarmas />}
            {!["dashboard", "datos-sitio", "medidores", "mensajes", "ftp", "fecha-hora", "alarmas"].includes(seccionActiva) && (
              <SeccionPendiente id={seccion?.id} titulo={seccion?.label} icono={seccion?.icon} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
