import { useTranslation } from "react-i18next";
import { useTema } from "../../hooks/useTema";

// Botón de tema claro/oscuro: muestra el ícono del estado actual (luna =
// oscuro, sol = claro) y alterna al hacer clic. Ver hooks/useTema.js.
export function BotonTema() {
  const { t } = useTranslation();
  const { tema, alternar } = useTema();
  const esOscuro = tema === "dark";
  const etiqueta = esOscuro ? t("comun.temaClaro") : t("comun.temaOscuro");

  return (
    <button type="button" className="boton-tema" onClick={alternar} aria-label={etiqueta} title={etiqueta}>
      {esOscuro ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
