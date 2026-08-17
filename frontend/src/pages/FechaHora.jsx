import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";
import { FichaFechaHora, NOMBRES_FECHA_HORA } from "../components/FichaFechaHora";

// Configuración de fecha/hora, igual a la pantalla "Configuración Fecha /
// Hora" del HMI físico (Kinco/ICH). Ver CONTEXTONuevo.md, sección 3.1.
export function FechaHora({ lecturas }) {
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>Fecha / Hora</h2>

      {cargando && <p className="pendiente">Cargando…</p>}
      {error && <p className="error">{error} Reintentando…</p>}
      {!cargando && !error && dispositivos.length === 0 && (
        <p className="pendiente">No hay dispositivos configurados todavía.</p>
      )}

      <div className="dispositivos">
        {dispositivos.map((dispositivo) => {
          const registros = dispositivo.registros.filter((r) => NOMBRES_FECHA_HORA.includes(r.nombre));
          if (registros.length === 0) return null;

          return (
            <div key={dispositivo.id} className="card">
              <div className="card-header">
                <CardTextura />
                <div className="icono-tarjeta">
                  <IconoSeccion id="clock-icon" size={24} />
                </div>
                <div>
                  <h3>{dispositivo.nombre}</h3>
                  <InsigniaDispositivo dispositivo={dispositivo} />
                </div>
              </div>

              <div className="card-body">
                <FichaFechaHora registros={registros} lecturas={lecturas} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
