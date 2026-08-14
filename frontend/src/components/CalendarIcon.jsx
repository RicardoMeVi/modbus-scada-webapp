import "./CalendarIcon.css";

// Extraído de calendar-icon (1).html: hoja de calendario con un día
// destacado. `size` es el ancho/alto final en px (viewBox interno 400x400).
export function CalendarIcon({ size = 320 }) {
  return (
    <svg
      className="cal-icon"
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="calBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F3F6" />
        </linearGradient>
        <linearGradient id="calHeader" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF7A6E" />
          <stop offset="100%" stopColor="#E8483B" />
        </linearGradient>
        <filter id="calShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>

      <g filter="url(#calShadow)" transform="translate(200 205) rotate(-4)">
        <rect x="-105" y="-90" width="210" height="180" rx="18" fill="url(#calBody)" />

        <path
          d="M -105 -72 C -105 -82, -97 -90, -87 -90 L 87 -90
             C 97 -90, 105 -82, 105 -72 L 105 -45 L -105 -45 Z"
          fill="url(#calHeader)"
        />

        <rect x="-62" y="-100" width="14" height="30" rx="7" fill="#C43A2F" />
        <rect x="48" y="-100" width="14" height="30" rx="7" fill="#C43A2F" />

        <g fontFamily="'Arial Rounded MT Bold','Segoe UI',sans-serif" fontWeight="700" fontSize="13" fill="#B9C0C9" textAnchor="middle">
          <text x="-70" y="-25">L</text>
          <text x="-35" y="-25">M</text>
          <text x="0" y="-25">M</text>
          <text x="35" y="-25">J</text>
          <text x="70" y="-25">V</text>
        </g>

        <g fontFamily="'Arial Rounded MT Bold','Segoe UI',sans-serif" fontWeight="600" fontSize="16" fill="#5B6472" textAnchor="middle">
          <text x="-70" y="4">3</text>
          <text x="-35" y="4">4</text>
          <text x="0" y="4">5</text>
          <text x="35" y="4">6</text>
          <text x="70" y="4">7</text>
        </g>

        <g fontFamily="'Arial Rounded MT Bold','Segoe UI',sans-serif" fontWeight="600" fontSize="16" fill="#5B6472" textAnchor="middle">
          <text x="-70" y="40">10</text>
          <text x="-35" y="40">11</text>
          <text x="35" y="40">13</text>
          <text x="70" y="40">14</text>
        </g>

        <circle cx="0" cy="35" r="20" fill="#E8483B" />
        <text
          x="0"
          y="41"
          textAnchor="middle"
          fontFamily="'Arial Rounded MT Bold','Segoe UI',sans-serif"
          fontWeight="800"
          fontSize="17"
          fill="#FFFFFF"
        >
          12
        </text>
      </g>
    </svg>
  );
}
