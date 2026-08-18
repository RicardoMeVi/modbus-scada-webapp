import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";

const CLAVE_IDIOMA = "ich-idioma";

function idiomaGuardado() {
  try {
    const valor = localStorage.getItem(CLAVE_IDIOMA);
    return valor === "en" || valor === "es" ? valor : null;
  } catch {
    return null;
  }
}

function idiomaNavegador() {
  return navigator.language?.slice(0, 2) === "en" ? "en" : "es";
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: idiomaGuardado() ?? idiomaNavegador(),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

// Persiste la elección del usuario para que sobreviva a un recargado —
// independiente de la del sistema, igual que el tema (ver hooks/useTema.js).
i18n.on("languageChanged", (idioma) => {
  try {
    localStorage.setItem(CLAVE_IDIOMA, idioma);
  } catch {
    // localStorage no disponible (modo privado, permisos, etc.)
  }
});

export default i18n;
