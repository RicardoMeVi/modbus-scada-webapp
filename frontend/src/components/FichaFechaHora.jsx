import { useEffect, useRef, useState } from "react";
import { escribirValor } from "../api";
import { Toast } from "./Toast";

const CAMPOS = [
  { nombre: "Año", clave: "anio", min: 2000, max: 2099 },
  { nombre: "Hora", clave: "hora", min: 0, max: 23 },
  { nombre: "Mes", clave: "mes", min: 1, max: 12 },
  { nombre: "Minutos", clave: "minutos", min: 0, max: 59 },
  { nombre: "Día", clave: "dia", min: 1, max: 31 },
  { nombre: "Segundos", clave: "segundos", min: 0, max: 59 },
];

// Configuración de fecha/hora, igual a la pantalla "Configuración Fecha /
// Hora" del HMI físico (Kinco/ICH): reloj interno de la UTD (sección 3.1 de
// CONTEXTONuevo.md), con flujo de edición "modificar → escritura → lectura
// de confirmación" (cada campo es un Holding Register individual).
export function FichaFechaHora({ registros, lecturas }) {
  const registroPorNombre = Object.fromEntries(registros.map((r) => [r.nombre, r]));

  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null);
  // Momento de la última escritura exitosa. Hasta que no llegue por SignalR
  // una lectura posterior a ese momento (la "lectura de confirmación" del
  // flujo real del HMI), se sigue mostrando lo recién guardado en vez de
  // pisarlo con la última lectura en vivo, que puede ser previa a la
  // escritura y "revertir" visualmente el cambio que se acaba de confirmar.
  const ultimaEscrituraRef = useRef(null);

  // Mientras no se está editando, los campos siguen el reloj en vivo
  // (llega por SignalR, igual que Caudal/Totalizado en Medidores).
  useEffect(() => {
    if (editando) return;
    setCampos((prev) => {
      const siguiente = {};
      for (const { nombre, clave } of CAMPOS) {
        const registro = registroPorNombre[nombre];
        const lectura = registro ? lecturas[registro.id] : null;
        const timestamp = lectura && new Date(lectura.timestamp ?? lectura.Timestamp);
        const esConfirmacionFresca =
          !ultimaEscrituraRef.current || (timestamp && timestamp >= ultimaEscrituraRef.current);

        siguiente[clave] = lectura && esConfirmacionFresca ? (lectura.valor ?? lectura.Valor) : (prev[clave] ?? "");
      }
      return siguiente;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando, lecturas]);

  function actualizarCampo(clave, valor) {
    // Al primer cambio se congela el seguimiento en vivo (ver el efecto de
    // arriba) para que un tick de SignalR no pise lo que se está tipeando.
    setEditando(true);
    setCampos((prev) => ({ ...prev, [clave]: valor }));
  }

  async function modificar() {
    setGuardando(true);
    setEstado(null);
    try {
      for (const { nombre, clave } of CAMPOS) {
        const registro = registroPorNombre[nombre];
        if (!registro || campos[clave] === "") continue;
        await escribirValor(registro.dispositivoId, registro.id, Number(campos[clave]));
      }
      ultimaEscrituraRef.current = new Date();
      setEstado("ok");
      setEditando(false);
    } catch {
      setEstado("error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="ficha-sitio">
      <div className="ficha-fecha-grid">
        {CAMPOS.map(({ nombre, clave, min, max }) => (
          <label key={clave}>
            {nombre.toUpperCase()}
            <input
              type="number"
              min={min}
              max={max}
              value={campos[clave] ?? ""}
              onChange={(e) => actualizarCampo(clave, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="ficha-sitio-acciones">
        <button type="button" className="ficha-sitio-guardar" onClick={modificar} disabled={guardando}>
          {guardando ? "Guardando…" : "Modificar"}
        </button>
      </div>

      {estado && (
        <Toast
          tipo={estado}
          mensaje={
            estado === "ok"
              ? "Fecha y hora actualizadas correctamente."
              : "No se pudo escribir la fecha/hora. Intentá de nuevo."
          }
          onCerrar={() => setEstado(null)}
        />
      )}
    </div>
  );
}

export const NOMBRES_FECHA_HORA = CAMPOS.map((c) => c.nombre);
