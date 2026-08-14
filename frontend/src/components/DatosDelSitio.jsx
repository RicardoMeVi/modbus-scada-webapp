import { useEffect, useState } from "react";
import { getDispositivos } from "../api";
import { RegistroControl } from "../RegistroControl";
import { EarthLoader } from "./EarthLoader";

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
      <h2>Datos del sitioO</h2>

      {error && <p className="error">{error}</p>}
      {!error && dispositivos.length === 0 && (
        <p className="pendiente">No hay dispositivos configurados todavía.</p>
      )}

      
    </div>
  );
}
