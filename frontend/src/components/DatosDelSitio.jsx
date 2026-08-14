import { useEffect, useState } from "react";
import { getDispositivos } from "../api";
import { RegistroControl } from "../RegistroControl";

// Vista principal: dispositivos (Mobicon por sitio) y sus registros Modbus
// en tiempo real. Ver CONTEXTO.md, secciones 2 y 3.
export function DatosDelSitio({ lecturas }) {
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDispositivos()
      .then(setDispositivos)
      .catch(() => setError("No se pudo conectar con el backend."));
  }, []);

  return (
    <div>
      <h2>Datos del sitio</h2>

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
