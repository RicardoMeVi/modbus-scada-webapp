import { useEffect, useState } from "react";
import { getDispositivos } from "../api";
import { EarthLoader } from "./EarthLoader";
import { FichaSitio } from "./FichaSitio";

// Identificación del sitio, igual a la pantalla "Datos del sitio" del HMI
// físico (Kinco/ICH): NSM, NSUE, NSUT, RFC, Unidad de verificación,
// Contraseña UTD y coordenadas. No incluye lecturas Modbus en vivo — esas
// viven en el Dashboard y en la pantalla completa del sitio.
export function DatosDelSitio() {
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
      {!error && dispositivos.length === 0 && (
        <p className="pendiente">No hay dispositivos configurados todavía.</p>
      )}

      <div className="dispositivos">
        {dispositivos.map((dispositivo) => (
          <div key={dispositivo.id} className="card">
            <div className="card-header">
              <EarthLoader size={48} pulso={false} />
              <div>
                <h3>{dispositivo.nombre}</h3>
                <span className="badge">
                  {dispositivo.ipAddress}:{dispositivo.puerto} &middot; slave {dispositivo.slaveId}
                </span>
              </div>
            </div>

            <FichaSitio dispositivo={dispositivo} />
          </div>
        ))}
      </div>
    </div>
  );
}
