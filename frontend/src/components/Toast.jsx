import { useEffect, useRef } from "react";
import "./Toast.css";

// Banner de confirmación flotante (esquina inferior derecha). Se cierra
// solo a los 4s, o al tocar la X.
export function Toast({ tipo, mensaje, onCerrar }) {
  // onCerrar suele ser un closure nuevo en cada render del padre (acá,
  // FichaSitio se re-renderiza cada ~2s por las lecturas de SignalR). Si el
  // timer dependiera de esa referencia, se reiniciaba antes de completar
  // los 4s y el toast nunca desaparecía solo. La ref lo desacopla: el
  // temporizador arranca una sola vez, al montar.
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    const id = setTimeout(() => onCerrarRef.current(), 4000);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={`toast ${tipo}`} role="status">
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
      <button className="toast-cerrar" onClick={onCerrar} aria-label="Cerrar">
        ✕
      </button>
    </div>
  );
}
