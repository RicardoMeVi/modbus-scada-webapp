import { useState } from "react";
import { escribirValor, TABLA_MODBUS } from "../api";

// Control de un registro Modbus: solo lectura para Input Register/Discrete
// Input, y editable (como en un panel HMI) para Coil/Holding Register —
// salvo que `bloqueado` esté activo (sin verificar el PIN todavía), en
// cuyo caso se muestra el valor pero no el control de escritura.
export function RegistroControl({ dispositivoId, registro, lectura, bloqueado = false }) {
  const [valorEditado, setValorEditado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEscritura, setErrorEscritura] = useState(null);

  const valorActual = lectura ? `${lectura.valor} ${registro.unidad ?? ""}`.trim() : "—";
  const esEscribible =
    registro.tabla === TABLA_MODBUS.COIL || registro.tabla === TABLA_MODBUS.HOLDING_REGISTER;

  async function enviar(valor) {
    setEnviando(true);
    setErrorEscritura(null);
    try {
      await escribirValor(dispositivoId, registro.id, valor);
    } catch {
      setErrorEscritura("No se pudo escribir el valor.");
    } finally {
      setEnviando(false);
    }
  }

  if (esEscribible && bloqueado) {
    return (
      <li className="registro-row">
        <span className="registro-label">{registro.nombre}</span>
        <span className="registro-valor">
          {registro.tabla === TABLA_MODBUS.COIL
            ? lectura?.valor === 1
              ? "Encendido"
              : "Apagado"
            : valorActual}
        </span>
      </li>
    );
  }

  if (registro.tabla === TABLA_MODBUS.COIL) {
    const encendido = lectura?.valor === 1;
    return (
      <li className="registro-row">
        <span className="registro-label">{registro.nombre}</span>
        <div className="registro-control">
          {errorEscritura && <span className="error">{errorEscritura}</span>}
          <button
            className={`switch ${encendido ? "on" : "off"}`}
            disabled={enviando}
            onClick={() => enviar(encendido ? 0 : 1)}
          >
            {encendido ? "Encendido" : "Apagado"}
          </button>
        </div>
      </li>
    );
  }

  if (registro.tabla === TABLA_MODBUS.HOLDING_REGISTER) {
    return (
      <li className="registro-row">
        <span className="registro-label">{registro.nombre}</span>
        <span className="registro-valor">{valorActual}</span>
        <div className="registro-control">
          {errorEscritura && <span className="error">{errorEscritura}</span>}
          <input
            type="number"
            placeholder="valor"
            value={valorEditado}
            onChange={(e) => setValorEditado(e.target.value)}
            disabled={enviando}
          />
          <button
            className="aplicar"
            disabled={enviando || valorEditado === ""}
            onClick={() => {
              enviar(Number(valorEditado));
              setValorEditado("");
            }}
          >
            Aplicar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="registro-row">
      <span className="registro-label">{registro.nombre}</span>
      <span className="registro-valor">{valorActual}</span>
    </li>
  );
}
