// Detalle decorativo inspirado en el membrete de ICH: unas pocas líneas
// finas curvas, contenidas solo en la barra superior (no se repiten por
// toda la pantalla). Puramente decorativo, sin logo ni texto.
export function TopbarLines() {
  return (
    <svg
      className="topbar-lines"
      viewBox="0 0 900 140"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="topbarLineFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#96897c" stopOpacity="0" />
          <stop offset="22%" stopColor="#96897c" stopOpacity="0.55" />
          <stop offset="75%" stopColor="#96897c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#96897c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#topbarLineFade)" strokeWidth="1.3" strokeLinecap="round">
        <path d="M180,25 Q 400,10 850,35" />
        <path d="M160,42 Q 420,28 880,55" />
        <path d="M200,58 Q 450,45 900,72" />
        <path d="M140,75 Q 430,60 860,90" />
        <path d="M220,92 Q 470,78 900,108" />
        <path d="M170,108 Q 440,95 870,125" />
      </g>
    </svg>
  );
}
