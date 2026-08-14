import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDispositivo } from "../api";
import { useModbusHub } from "../useModbusHub";
import { EarthLoader } from "./EarthLoader";
import { ModalVerificacion } from "./ModalVerificacion";
import logo from "../assets/Logo.png";
import "./PantallaSitio.css";

// Pantalla completa que replica la vista "UTD ICH PSI" del panel HMI
// físico (Kinco/ICH): logo, Caudal instantáneo, Totalizado y la Unidad de
// Verificación. Es una ruta aparte (no vive dentro del dashboard) porque
// en el equipo real es una pantalla exclusiva, no una sección de un menú
// persistente.
const NOMBRES_HERO = ["Caudal instantáneo", "Totalizado"];

export function PantallaSitio() {
  const { dispositivoId } = useParams();
  const [dispositivo, setDispositivo] = useState(null);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [verificado, setVerificado] = useState(false);
  const { lecturas } = useModbusHub();

  useEffect(() => {
    getDispositivo(dispositivoId)
      .then(setDispositivo)
      .catch(() => setError("No se pudo cargar el sitio."));
  }, [dispositivoId]);

  const registrosHero = dispositivo?.registros.filter((r) => NOMBRES_HERO.includes(r.nombre)) ?? [];

  return (
    <div className="pantalla-sitio">
      <Link to="/" className="pantalla-sitio-volver">
        ← Panel de control
      </Link>

      <button
        className={`boton-verificacion pantalla-sitio-verificacion ${verificado ? "activo" : ""}`}
        onClick={() => setModalAbierto(true)}
      >
        {verificado ? "Verificado" : "Unidad de Verificación"}
      </button>

      <div className="pantalla-sitio-header">
        <img src={logo} alt="ICH" className="brand-mark" />
        <div className="pantalla-sitio-marca">
          <span className="brand-nombre">ICH</span>
          <h1>{dispositivo?.nombre ?? "Cargando…"}</h1>
        </div>
      </div>

      {error && <p className="pantalla-sitio-error">{error}</p>}

      <div className="pantalla-sitio-stats">
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

      {modalAbierto && (
        <ModalVerificacion
          onClose={() => setModalAbierto(false)}
          onSuccess={() => {
            setVerificado(true);
            setModalAbierto(false);
          }}
        />
      )}
    </div>
  );
}
