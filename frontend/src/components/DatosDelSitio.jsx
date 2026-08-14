import { useEffect, useState } from "react";
import { getDispositivos } from "../api";
import { RegistroControl } from "../RegistroControl";
import { EarthLoader } from "./EarthLoader";
import { ModalVerificacion } from "./ModalVerificacion";

// Registros que se muestran como lectura destacada ("hero"), igual que la
// pantalla principal de los paneles Kinco/ICH reales (Caudal instantáneo +
// Totalizado). El resto de los registros del dispositivo va como detalle.
const NOMBRES_HERO = ["Caudal instantáneo", "Totalizado"];

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function DatosDelSitio({ lecturas }) {
  const [dispositivos, setDispositivos] = useState([]);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [desbloqueado, setDesbloqueado] = useState(false);

  useEffect(() => {
    getDispositivos()
      .then(setDispositivos)
      .catch(() => setError("No se pudo conectar con el backend."));
  }, []);

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {!error && dispositivos.length === 0 && (
        <p className="pendiente">No hay dispositivos configurados todavía.</p>
      )}

      {dispositivos.map((dispositivo) => {
        const registrosHero = dispositivo.registros.filter((r) => NOMBRES_HERO.includes(r.nombre));
        const registrosDetalle = dispositivo.registros.filter((r) => !NOMBRES_HERO.includes(r.nombre));

        return (
          <div key={dispositivo.id} className="sitio">
            <div className="sitio-hero">
              <div className="sitio-hero-top">
                <EarthLoader size={44} pulso={false} />
                <div className="sitio-hero-titulo">
                  <span className="sitio-hero-nombre">{dispositivo.nombre}</span>
                  <span className="badge">
                    {dispositivo.ipAddress}:{dispositivo.puerto} &middot; slave {dispositivo.slaveId}
                  </span>
                </div>
                <button
                  className={`boton-verificacion ${desbloqueado ? "activo" : ""}`}
                  onClick={() => setModalAbierto(true)}
                >
                  <LockIcon />
                  {desbloqueado ? "Verificado" : "Unidad de Verificación"}
                </button>
              </div>

              {registrosHero.length > 0 && (
                <div className="sitio-hero-stats">
                  {registrosHero.map((registro) => {
                    const lectura = lecturas[registro.id];
                    return (
                      <div key={registro.id} className="stat-tile">
                        <span className="stat-label">{registro.nombre}</span>
                        <span className="stat-valor">
                          {(lectura?.valor ?? 0).toFixed(2)}
                          <small>{registro.unidad}</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {registrosDetalle.length > 0 && (
              <div className="card">
                <h3>Parámetros</h3>
                {!desbloqueado && (
                  <p className="pendiente aviso-bloqueo">
                    Solo lectura &mdash; tocá &quot;Unidad de Verificación&quot; para habilitar la edición.
                  </p>
                )}
                <ul className="registros">
                  {registrosDetalle.map((registro) => (
                    <RegistroControl
                      key={registro.id}
                      dispositivoId={dispositivo.id}
                      registro={registro}
                      lectura={lecturas[registro.id]}
                      bloqueado={!desbloqueado}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {modalAbierto && (
        <ModalVerificacion
          onClose={() => setModalAbierto(false)}
          onSuccess={() => {
            setDesbloqueado(true);
            setModalAbierto(false);
          }}
        />
      )}
    </div>
  );
}
