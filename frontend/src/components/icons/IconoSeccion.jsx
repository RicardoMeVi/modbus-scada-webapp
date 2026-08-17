// Ícono de línea fina del sprite compartido (public/icons.svg) — el mismo
// set uniforme que usa el sidebar, reutilizado acá para que el encabezado
// de cada tarjeta tenga el mismo estilo en vez de un ícono a color propio.
export function IconoSeccion({ id, size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <use href={`/icons.svg#${id}`} />
    </svg>
  );
}
