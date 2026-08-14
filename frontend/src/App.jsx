import { useState } from "react";
import { useModbusHub } from "./useModbusHub";
import { Sidebar } from "./components/Sidebar";
import { DatosDelSitio } from "./components/DatosDelSitio";
import { SeccionPendiente } from "./components/SeccionPendiente";
import { SECCIONES } from "./sections";
import "./App.css";

function App() {
  const [seccionActiva, setSeccionActiva] = useState(SECCIONES[0].id);
  const lecturas = useModbusHub();

  return (
    <div className="app">
      <h1>Modbus SCADA</h1>

      <div className="layout">
        <Sidebar activo={seccionActiva} onSeleccionar={setSeccionActiva} />

        <main className="contenido">
          {seccionActiva === "datos-sitio" && <DatosDelSitio lecturas={lecturas} />}
          {seccionActiva !== "datos-sitio" && (
            <SeccionPendiente
              titulo={SECCIONES.find((s) => s.id === seccionActiva).label}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
