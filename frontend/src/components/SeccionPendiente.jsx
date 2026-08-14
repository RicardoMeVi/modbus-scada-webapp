import { ICONOS_PERSONALIZADOS } from "../iconosPersonalizados";

// Placeholder para las secciones del HMI que todavía no se definen en
// detalle (ver CONTEXTO.md, sección 3: se detallan una a la vez). Solo
// existe el esqueleto de navegación por ahora.
export function SeccionPendiente({ id, titulo, icono }) {
  const IconoPersonalizado = ICONOS_PERSONALIZADOS[id];

  return (
    <div className="seccion-pendiente">
      {IconoPersonalizado ? (
        <IconoPersonalizado size={96} />
      ) : (
        <svg aria-hidden="true" className="icono-grande">
          <use href={`/icons.svg#${icono}`} />
        </svg>
      )}
      <h2>{titulo}</h2>
      <p className="pendiente">Esta sección todavía no está definida en detalle.</p>
    </div>
  );
}
