// Textura decorativa del encabezado de cada tarjeta: olas suaves y
// rellenas (no líneas delgadas), superpuestas con opacidad creciente para
// dar sensación de profundidad — igual al recurso que pidió el usuario.
// Puramente decorativo.
export function CardTextura() {
  return (
    <svg className="card-textura" viewBox="0 0 500 150" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0,55 C125,15 250,95 375,55 C437,35 470,65 500,50 L500,0 L0,0 Z"
        fill="#5b6bdb"
        opacity="0.035"
      />
      <path
        d="M0,85 C125,45 250,125 375,85 C437,65 470,95 500,80 L500,150 L0,150 Z"
        fill="#5b6bdb"
        opacity="0.05"
      />
      <path
        d="M0,108 C125,72 250,142 375,102 C437,84 470,110 500,96 L500,150 L0,150 Z"
        fill="#7c86e8"
        opacity="0.08"
      />
    </svg>
  );
}
