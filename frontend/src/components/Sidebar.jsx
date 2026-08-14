import { SECCIONES } from "../sections";
import { ICONOS_PERSONALIZADOS } from "../iconosPersonalizados";

export function Sidebar({ activo, onSeleccionar }) {
  return (
    <nav className="sidebar">
      <ul>
        {SECCIONES.map((seccion) => {
          const IconoPersonalizado = ICONOS_PERSONALIZADOS[seccion.id];
          return (
            <li key={seccion.id}>
              <button
                className={seccion.id === activo ? "activo" : ""}
                onClick={() => onSeleccionar(seccion.id)}
              >
                {IconoPersonalizado ? (
                  <IconoPersonalizado size={46} />
                ) : (
                  <span className="icon-chip">
                    <svg aria-hidden="true">
                      <use href={`/icons.svg#${seccion.icon}`} />
                    </svg>
                  </span>
                )}
                <span className="label">{seccion.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
