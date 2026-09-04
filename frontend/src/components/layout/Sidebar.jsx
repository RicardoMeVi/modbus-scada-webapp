import { useTranslation } from "react-i18next";
import { SECCIONES } from "../../config/sections";

export function Sidebar({ activo, onSeleccionar, ocultarConexion }) {
  const { t } = useTranslation();
  // Con el equipo ya conectado y respondiendo, no tiene sentido ofrecer
  // cambiar de puerto COM desde acá -- ver FichaConexion para el porqué
  // (la detección automática da falso negativo sobre el puerto en uso, y
  // guardar un puerto nuevo no valida nada antes de aplicarlo).
  const secciones = ocultarConexion ? SECCIONES.filter((s) => s.id !== "conexion") : SECCIONES;

  return (
    <nav className="sidebar">
      <ul>
        {secciones.map((seccion) => (
          <li key={seccion.id}>
            <button
              className={seccion.id === activo ? "activo" : ""}
              onClick={() => onSeleccionar(seccion.id)}
            >
              <span className="icon-chip">
                <svg aria-hidden="true">
                  <use href={`/icons.svg#${seccion.icon}`} />
                </svg>
              </span>
              <span className="label">{t(seccion.labelKey)}</span>
            </button>
          </li>
        ))}
      </ul>
      <span className="sidebar-version">v{__APP_VERSION__}</span>
    </nav>
  );
}
