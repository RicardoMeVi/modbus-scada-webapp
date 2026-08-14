import { useState } from "react";
import { Link } from "react-router-dom";
import { useModbusHub } from "./useModbusHub";
import { Sidebar } from "./components/Sidebar";
import { DatosDelSitio } from "./components/DatosDelSitio";
import { SeccionPendiente } from "./components/SeccionPendiente";
import { TopbarLines } from "./components/TopbarLines";
import { SECCIONES } from "./sections";
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
          {seccionActiva === "datos-sitio" ? (
            <DatosDelSitio lecturas={lecturas} />
          ) : (
            <SeccionPendiente id={seccion.id} titulo={seccion.label} icono={seccion.icon} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
