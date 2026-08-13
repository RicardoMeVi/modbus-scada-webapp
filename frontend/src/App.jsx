import { useEffect, useState } from "react";
import { getDispositivos } from "./api";
import { useModbusHub } from "./useModbusHub";
import { RegistroControl } from "./RegistroControl";
import "./App.css";

function App() {
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);
  const lecturas = useModbusHub();

  useEffect(() => {
    getDispositivos()
      .then(setDispositivos)
      .catch(() => setError("No se pudo conectar con el backend."));
  }, []);

  return (
    <div className="app">
      <h1>Modbus SCADA</h1>

      {error && <p className="error">{error}</p>}
      {!error && dispositivos.length === 0 && <p>No hay dispositivos configurados todavía.</p>}

      <div className="dispositivos">
        {dispositivos.map((dispositivo) => (
          <div key={dispositivo.id} className="card">
            <h2>{dispositivo.nombre}</h2>
            <p>
              {dispositivo.ipAddress}:{dispositivo.puerto} (slave {dispositivo.slaveId})
            </p>
            <ul>
              {dispositivo.registros.map((registro) => (
                <RegistroControl
                  key={registro.id}
                  dispositivoId={dispositivo.id}
                  registro={registro}
                  lectura={lecturas[registro.id]}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
