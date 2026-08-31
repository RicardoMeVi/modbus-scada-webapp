import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Toast.css";

const DURACION_MS = 4000;
const FADE_MS = 220;

// Banner de confirmación flotante (esquina inferior derecha). Se cierra
// solo a los 4s (con un desvanecimiento antes de desmontar), o al tocar la X.
export function Toast({ tipo, mensaje, onCerrar }) {
  const { t } = useTranslation();
  const [saliendo, setSaliendo] = useState(false);

  // onCerrar suele ser un closure nuevo en cada render del padre (acá,
  // FichaSitio se re-renderiza cada ~2s por las lecturas de SignalR). Si los
  // timers dependieran de esa referencia, se reiniciaban antes de completar
  // y el toast nunca desaparecía solo. La ref los desacopla: arrancan una
  // sola vez, al montar.
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  function cerrar() {
    setSaliendo(true);
    setTimeout(() => onCerrarRef.current(), FADE_MS);
  }

  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;

  useEffect(() => {
    const id = setTimeout(() => cerrarRef.current(), DURACION_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={`toast ${tipo} ${saliendo ? "saliendo" : ""}`} role="status">
      <span className="toast-icono">
        {tipo === "ok" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        )}
      </span>
      <span>{mensaje}</span>
      <button type="button" className="toast-cerrar" onClick={cerrar} aria-label={t("comun.cerrar")}>
        ✕
      </button>
    </div>
  );
}
