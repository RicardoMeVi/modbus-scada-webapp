import { useTranslation } from "react-i18next";

// Alterna español/inglés. Solo dos idiomas soportados, así que un botón que
// alterna es más simple que un desplegable — ver src/i18n para agregar más.
export function SelectorIdioma() {
  const { i18n, t } = useTranslation();
  const idiomaActual = i18n.resolvedLanguage === "en" ? "en" : "es";
  const siguiente = idiomaActual === "es" ? "en" : "es";

  return (
    <button
      type="button"
      className="boton-idioma"
      onClick={() => i18n.changeLanguage(siguiente)}
      aria-label={t("comun.idioma")}
      title={t("comun.idioma")}
    >
      {idiomaActual.toUpperCase()}
    </button>
  );
}
