import { useCallback, useEffect, useState } from "react";

const CLAVE = "ich-tema";

function leerGuardado() {
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor === "light" || valor === "dark" ? valor : null;
  } catch {
    return null;
  }
}

function prefiereOscuroSistema() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Maneja el tema claro/oscuro de toda la app. Si el usuario nunca tocó el
// botón, sigue la preferencia del sistema operativo (y reacciona si esta
// cambia en vivo); en cuanto el usuario alterna el botón una vez, esa
// elección se guarda en localStorage y ya no vuelve a seguir al sistema.
export function useTema() {
  const [elegido, setElegido] = useState(leerGuardado);
  const [prefiereOscuro, setPrefiereOscuro] = useState(prefiereOscuroSistema);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const escuchar = (e) => setPrefiereOscuro(e.matches);
    media.addEventListener("change", escuchar);
    return () => media.removeEventListener("change", escuchar);
  }, []);

  const tema = elegido ?? (prefiereOscuro ? "dark" : "light");

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
  }, [tema]);

  const alternar = useCallback(() => {
    setElegido((actual) => {
      const base = actual ?? (prefiereOscuroSistema() ? "dark" : "light");
      const siguiente = base === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(CLAVE, siguiente);
      } catch {
        // localStorage no disponible (modo privado, permisos, etc.)
      }
      return siguiente;
    });
  }, []);

  return { tema, alternar };
}
