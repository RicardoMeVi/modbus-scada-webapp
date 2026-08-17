import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";
import { FichaFtp } from "../components/FichaFtp";

// Configuración de FTP, igual a la pantalla "FTP" del HMI físico
// (Kinco/ICH). Ver CONTEXTONuevo.md, sección 3.4.
export function Ftp() {
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>FTP</h2>

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
                <IconoSeccion id="ftp-icon" size={24} />
              </div>
              <div>
                <h3>{dispositivo.nombre}</h3>
                <InsigniaDispositivo dispositivo={dispositivo} />
              </div>
            </div>

            <div className="card-body">
              <FichaFtp dispositivo={dispositivo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
