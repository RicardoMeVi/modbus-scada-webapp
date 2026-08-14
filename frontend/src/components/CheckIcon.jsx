import "./CheckIcon.css";

// Extraído de check-icon.html: triángulo de alerta con un check verde.
// `size` es el ancho/alto final en px (viewBox interno fijo, 400x400).
export function CheckIcon({ size = 320 }) {
  return (
    <svg
      className="check-icon"
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE96B" />
          <stop offset="100%" stopColor="#FFC93C" />
        </linearGradient>
        <filter id="triShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#triShadow)" transform="translate(200 205)">
        <path
          d="M 0 -115 C 6 -115, 11 -112, 14 -107 L 122 88
             C 129 100, 120 115, 106 115 L -106 115
             C -120 115, -129 100, -122 88 L -14 -107
             C -11 -112, -6 -115, 0 -115 Z"
          fill="url(#triGrad)"
        />

        <circle cx="0" cy="22" r="66" fill="#FFFFFF" />

        <path
          d="M -34 22 L -8 50 L 38 -18"
          fill="none"
          stroke="#5FBE4F"
          strokeWidth="19"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
