import { useState } from "react";
import { escribirValor, TABLA_MODBUS } from "./api";

// Control de un registro Modbus: solo lectura para Input Register/Discrete
// Input, y editable (como en un panel HMI) para Coil/Holding Register.
export function RegistroControl({ dispositivoId, registro, lectura }) {
  const [valorEditado, setValorEditado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEscritura, setErrorEscritura] = useState(null);

  const valorActual = lectura ? `${lectura.valor} ${registro.unidad ?? ""}` : "—";

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

  if (registro.tabla === TABLA_MODBUS.COIL) {
    const encendido = lectura?.valor === 1;
    return (
      <li>
        {registro.nombre}: {valorActual}{" "}
        <button disabled={enviando} onClick={() => enviar(encendido ? 0 : 1)}>
          {encendido ? "Apagar" : "Encender"}
        </button>
        {errorEscritura && <span className="error"> {errorEscritura}</span>}
      </li>
    );
  }

  if (registro.tabla === TABLA_MODBUS.HOLDING_REGISTER) {
    return (
      <li>
        {registro.nombre}: {valorActual}{" "}
        <input
          type="number"
          placeholder="nuevo valor"
          value={valorEditado}
          onChange={(e) => setValorEditado(e.target.value)}
          disabled={enviando}
        />
        <button
          disabled={enviando || valorEditado === ""}
          onClick={() => {
            enviar(Number(valorEditado));
            setValorEditado("");
          }}
        >
          Aplicar
        </button>
        {errorEscritura && <span className="error"> {errorEscritura}</span>}
      </li>
    );
  }

  return (
    <li>
      {registro.nombre}: {valorActual}
    </li>
  );
}
