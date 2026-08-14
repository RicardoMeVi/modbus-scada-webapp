import { useState } from "react";
import { validarPin } from "../api";
import { Keypad } from "./Keypad";
import "./ModalVerificacion.css";

// Replica el flujo del panel HMI físico: al tocar "Unidad de Verificación"
// se abre este modal con teclado numérico; Enter valida el PIN contra el
// backend (POST /api/verificacion/validar) y la X cierra sin desbloquear
// nada, volviendo a la pantalla principal de solo lectura.
export function ModalVerificacion({ onClose, onSuccess }) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState(false);
  const [verificando, setVerificando] = useState(false);

  async function confirmar() {
    if (!valor || verificando) return;
    setVerificando(true);
    const ok = await validarPin(valor);
    setVerificando(false);
    if (ok) {
      onSuccess();
    } else {
      setError(true);
      setValor("");
    }
  }

  function manejarTecla(tecla) {
    setError(false);
    if (tecla === "CLR") return setValor("");
    if (tecla === "←") return setValor((v) => v.slice(0, -1));
    if (tecla === "ENTER") return confirmar();
    setValor((v) => (v + tecla).slice(0, 12));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-verificacion" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Contraseña Unidad de Verificación</span>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="modal-body">

          <div className={`modal-input ${error ? "error" : ""}`}>
            {valor ? "•".repeat(valor.length) : <span className="placeholder">Ingresá el PIN</span>}
          </div>
          {error && <p className="modal-error-msg">PIN incorrecto</p>}

          <Keypad onKey={manejarTecla} disabled={verificando} />
        </div>
      </div>
    </div>
  );
}
