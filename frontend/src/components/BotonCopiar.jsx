import { useState } from "react";

// Copia el valor de un campo al portapapeles con un clic, para no tener que
// seleccionarlo a mano — útil en identificadores largos (NSM/NSUE/NSUT/RFC),
// IPs, contraseñas y coordenadas que después se pegan en otro lado (un
// reporte, un cliente FTP, Maps). Sin posicionamiento propio: el layout
// (superpuesto en un input, o en línea junto a una insignia) lo define el
// contenedor vía CSS, así funciona igual en ambos contextos.
export function BotonCopiar({ valor, className = "" }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(String(valor));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Portapapeles no disponible (permisos, contexto no seguro, etc.)
    }
  }

  return (
    <button
      type="button"
      className={`boton-copiar${copiado ? " copiado" : ""} ${className}`.trim()}
      onClick={copiar}
      disabled={!valor}
      aria-label={copiado ? "Copiado" : "Copiar"}
      title={copiado ? "Copiado" : "Copiar"}
    >
      {copiado ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}
