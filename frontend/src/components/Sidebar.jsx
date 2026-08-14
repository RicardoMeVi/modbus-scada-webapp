import { SECCIONES } from "../sections";

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
              <svg aria-hidden="true">
                <use href={`/icons.svg#${seccion.icon}`} />
              </svg>
              {seccion.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
