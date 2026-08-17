import { useEffect, useState } from "react";
import { getDispositivos } from "../api";
import { SECCIONES } from "../config/sections";

// Pantalla de bienvenida del Panel de control: resumen del estado del
// sistema y accesos directos a las demás secciones. Es la primera sección
// del sidebar y la que carga por defecto al entrar a /panel.
export function Dashboard({ lecturas, conectado, onNavegar }) {
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDispositivos()
      .then(setDispositivos)
      .catch(() => setError("No se pudo conectar con el backend."));
  }, []);

  const dispositivo = dispositivos[0];
  const registrosDestacados = dispositivo?.registros.filter((r) =>
    ["Caudal instantáneo", "Totalizado", "Nivel del tanque", "Bomba"].includes(r.nombre)
  );

  return (
    <div>
      <h2>Dashboard</h2>

      {error && <p className="error">{error}</p>}

      <div className="resumen-grid">
        <div className={`resumen-card ${conectado ? "ok" : "mal"}`}>
          <span className="resumen-label">Conexión en tiempo real</span>
          <span className="resumen-valor">{conectado ? "En línea" : "Desconectado"}</span>
        </div>
        <div className="resumen-card">
          <span className="resumen-label">Sitios configurados</span>
          <span className="resumen-valor">{dispositivos.length}</span>
        </div>
        {dispositivo && (
          <div className="resumen-card resumen-card-ancha">
            <span className="resumen-label">Sitio principal</span>
            <span className="resumen-valor resumen-valor-texto">{dispositivo.nombre}</span>
          </div>
        )}
      </div>

      {registrosDestacados && registrosDestacados.length > 0 && (
        <>
          <h3>Lecturas en vivo</h3>
          <div className="resumen-grid">
            {registrosDestacados.map((registro) => {
              const lectura = lecturas[registro.id];
              const valor = lectura?.valor;
              const texto =
                registro.nombre === "Bomba"
                  ? valor === 1
                    ? "Encendido"
                    : "Apagado"
                  : `${(valor ?? 0).toFixed(2)} ${registro.unidad ?? ""}`.trim();
              return (
                <div key={registro.id} className="resumen-card">
                  <span className="resumen-label">{registro.nombre}</span>
                  <span className="resumen-valor">{texto}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
}
