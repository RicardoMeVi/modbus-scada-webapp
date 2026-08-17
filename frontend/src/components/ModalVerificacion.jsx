import { useState } from "react";
import { validarPin } from "../api";
import "./ModalVerificacion.css";

// Replica el flujo del panel HMI físico: al tocar "Unidad de Verificación"
// se abre este modal; Enter (o el botón Validar) valida el PIN contra el
// backend (POST /api/verificacion/validar) y la X cierra sin desbloquear
// nada, volviendo a la pantalla principal de solo lectura. El PIN se
// tipea con el teclado físico (sistema pensado para notebook, no touch).
export function ModalVerificacion({ onClose, onSuccess }) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  async function confirmar(e) {
    e.preventDefault();
    if (!valor || verificando) return;
    setVerificando(true);
    const resultado = await validarPin(valor);
    setVerificando(false);
    if (resultado.ok) {
      onSuccess();
    } else {
      setError(resultado.motivo);
      setValor("");
    }
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

        <form className="modal-body" onSubmit={confirmar}>
          <input
            type="password"
            className={`modal-input ${error ? "error" : ""}`}
            placeholder="Ingresá el PIN"
            value={valor}
            onChange={(e) => {
              setError(null);
              setValor(e.target.value);
            }}
            disabled={verificando}
            autoFocus
          />
          {error === "incorrecto" && <p className="modal-error-msg">PIN incorrecto</p>}
          {error === "conexion" && (
            <p className="modal-error-msg">No se pudo conectar con el backend. ¿Está corriendo?</p>
          )}

          <button type="submit" className="modal-validar" disabled={verificando || !valor}>
            Validar
          </button>
        </form>
      </div>
    </div>
  );
}
