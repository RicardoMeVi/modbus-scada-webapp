import { useDispositivos } from "../hooks/useDispositivos";
import { IconoSeccion } from "../components/icons/IconoSeccion";
import { InsigniaDispositivo } from "../components/InsigniaDispositivo";
import { CardTextura } from "../components/layout/CardTextura";

// Estados de las alarmas/LEDs de la pantalla "Estados / Alarmas" del HMI
// físico (Kinco/ICH). Ver CONTEXTONuevo.md, sección 3.5: todas comparten el
// registro Modbus 15 (bits 0-4) salvo IHM (registro 29, bit 0) — de solo
// lectura, igual que GSM/GPRS/IHM ya mostrados en Mensaje (SMS) y FTP.
// "neutral" es el LED rosa pálido/apagado que se ve en la unidad de pruebas
// para las alarmas que todavía no tienen sensor conectado.
const ALARMAS = [
  { nombre: "Alimentación", estado: "neutral", icono: "enchufe-icon" },
  { nombre: "Batería", estado: "ok", icono: "bateria-icon" },
  { nombre: "Comunicación Tx Caudal", estado: "neutral", icono: "enlace-icon" },
  { nombre: "GSM conectado", estado: "mal", icono: "antena-icon" },
  { nombre: "GPRS conectado", estado: "mal", icono: "senal-icon" },
  { nombre: "IHM", estado: "ok", icono: "chip-icon" },
];

const TEXTO_ESTADO = { ok: "Conectado", mal: "Desconectado", neutral: "Sin dato" };

export function Alarmas() {
  const { dispositivos, error, cargando } = useDispositivos();

  return (
    <div>
      <h2>Estados / Alarmas</h2>

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
                <IconoSeccion id="alarm-icon" size={24} />
              </div>
              <div>
                <h3>{dispositivo.nombre}</h3>
                <InsigniaDispositivo dispositivo={dispositivo} />
              </div>
            </div>

            <div className="card-body">
              <div className="estado-tarjetas">
                {ALARMAS.map((alarma) => (
                  <div key={alarma.nombre} className={`estado-tarjeta ${alarma.estado}`}>
                    <div className="estado-tarjeta-icono">
                      <IconoSeccion id={alarma.icono} size={19} />
                    </div>
                    <div className="estado-tarjeta-texto">
                      <span className="estado-tarjeta-label">{alarma.nombre}</span>
                      <span className="estado-tarjeta-sub">Estado de conexión</span>
                      <span className="estado-tarjeta-pill">
                        <span className="estado-dot" /> {TEXTO_ESTADO[alarma.estado]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
