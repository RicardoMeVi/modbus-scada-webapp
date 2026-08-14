// Isotipo propio, inspirado en el logo de la empresa (arcos concéntricos en
// degradé azul, como una señal/onda) — no es una copia del archivo original.
export function BrandMark({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="brand-mark"
    >
      <defs>
        <linearGradient id="brandGradient" x1="4" y1="4" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#12356b" />
          <stop offset="0.55" stopColor="#2d6ccb" />
          <stop offset="1" stopColor="#7fd8e8" />
        </linearGradient>
      </defs>
      <g transform="rotate(-45 20 20)" fill="none" stroke="url(#brandGradient)" strokeLinecap="round">
        <circle cx="20" cy="20" r="7" strokeWidth="2.6" strokeDasharray="31.7 12.6" />
        <circle cx="20" cy="20" r="11.5" strokeWidth="2.6" strokeDasharray="52 20.2" />
        <circle cx="20" cy="20" r="16" strokeWidth="2.6" strokeDasharray="72.4 28.2" />
      </g>
      <circle cx="30.5" cy="27" r="2.1" fill="#7fd8e8" />
    </svg>
  );
}
