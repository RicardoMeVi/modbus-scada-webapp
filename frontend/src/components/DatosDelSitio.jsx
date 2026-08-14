import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDispositivos } from "../api";
import { RegistroControl } from "../RegistroControl";
import { EarthLoader } from "./EarthLoader";

// Panel de administración: lista de dispositivos y sus registros, todos
// editables directamente. La vista de pantalla completa que replica el
// panel HMI físico (Caudal/Totalizado + Unidad de Verificación) vive en
// una ruta aparte (ver PantallaSitio) — acá solo hay un link hacia ella.
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
      {!error && dispositivos.length === 0 && (
        <p className="pendiente">No hay dispositivos configurados todavía.</p>
      )}

      <div className="dispositivos">
        {dispositivos.map((dispositivo) => (
          <div key={dispositivo.id} className="card">
            <div className="card-header">
              <EarthLoader size={40} pulso={false} />
              <div>
                <h3>{dispositivo.nombre}</h3>
                <span className="badge">
                  {dispositivo.ipAddress}:{dispositivo.puerto} &middot; slave {dispositivo.slaveId}
                </span>
              </div>
              <Link to={`/sitio/${dispositivo.id}`} className="boton-pantalla-completa">
                Abrir pantalla del sitio
              </Link>
            </div>
            <ul className="registros">
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
