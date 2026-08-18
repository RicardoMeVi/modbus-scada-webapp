import { useState } from "react";
import { useTranslation } from "react-i18next";
import { validarPin } from "../api";
import "./ModalVerificacion.css";

// Replica el flujo del panel HMI físico: al tocar "Unidad de Verificación"
// se abre este modal; Enter (o el botón Validar) valida el PIN contra el
// backend (POST /api/verificacion/validar) y la X cierra sin desbloquear
// nada, volviendo a la pantalla principal de solo lectura. El PIN se
// tipea con el teclado físico (sistema pensado para notebook, no touch).
export function ModalVerificacion({ onClose, onSuccess }) {
  const { t } = useTranslation();
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
          <span>{t("modal.titulo")}</span>
          <button className="modal-close" onClick={onClose} aria-label={t("comun.cerrar")}>
            ✕
          </button>
        </div>

        <form className="modal-body" onSubmit={confirmar}>
          <input
            type="password"
            className={`modal-input ${error ? "error" : ""}`}
            placeholder={t("modal.placeholder")}
            value={valor}
            onChange={(e) => {
              setError(null);
              setValor(e.target.value);
            }}
            disabled={verificando}
            autoFocus
          />
          {error === "incorrecto" && <p className="modal-error-msg">{t("modal.pinIncorrecto")}</p>}
          {error === "conexion" && <p className="modal-error-msg">{t("modal.sinConexion")}</p>}

          <button type="submit" className="modal-validar" disabled={verificando || !valor}>
            {t("modal.validar")}
          </button>
        </form>
      </div>
    </div>
  );
}
