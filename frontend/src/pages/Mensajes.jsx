import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";
import { FichaSms } from "../components/FichaSms";

// Configuración de SMS, igual a la pantalla "SMS" del HMI físico
// (Kinco/ICH). Ver CONTEXTONuevo.md, sección 3.4.
export function Mensajes() {
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>Mensaje (SMS)</h2>

      {cargando && <p className="pendiente">Cargando…</p>}
      {error && <p className="error">{error} Reintentando…</p>}
      {!cargando && !error && dispositivos.length === 0 && (
        <p className="pendiente">No hay dispositivos configurados todavía.</p>
      )}

      <div className="dispositivos">
        {dispositivos.map((dispositivo) => (
          <div key={dispositivo.id} className="card">
            <div className="card-header">
              <CardTextura />
              <div className="icono-tarjeta">
                <IconoSeccion id="message-icon" size={24} />
              </div>
              <div>
                <h3>{dispositivo.nombre}</h3>
                <InsigniaDispositivo dispositivo={dispositivo} />
              </div>
            </div>

            <div className="card-body">
              <FichaSms dispositivo={dispositivo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
