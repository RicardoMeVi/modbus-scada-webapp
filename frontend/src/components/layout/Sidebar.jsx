import { SECCIONES } from "../../config/sections";

export function Sidebar({ activo, onSeleccionar }) {
  return (
    <nav className="sidebar">
      <ul>
        {SECCIONES.map((seccion) => (
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
              <span className="label">{seccion.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
