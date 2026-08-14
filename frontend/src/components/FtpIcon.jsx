import "./FtpIcon.css";

// Extraído de ftp-icon.html: globo + carpeta + flechas de subida/bajada.
// `size` es el ancho/alto final en px (el viewBox interno es fijo, 400x400).
export function FtpIcon({ size = 320 }) {
  return (
    <svg
      className="ftp-icon"
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="globeClip">
          <circle cx="245" cy="140" r="110" />
        </clipPath>
      </defs>

      {/* Globo */}
      <circle cx="245" cy="140" r="110" fill="#5AC8F2" />
      <g clipPath="url(#globeClip)" fill="none" stroke="#3B82D6" strokeWidth="7">
        <ellipse cx="245" cy="140" rx="37" ry="110" />
        <ellipse cx="245" cy="140" rx="74" ry="110" />
        <line x1="245" y1="30" x2="245" y2="250" />
        <ellipse cx="245" cy="140" rx="110" ry="37" />
        <ellipse cx="245" cy="140" rx="110" ry="74" />
        <line x1="135" y1="140" x2="355" y2="140" />
      </g>
      <circle cx="245" cy="140" r="110" fill="none" stroke="#3B82D6" strokeWidth="9" />

      {/* Flecha verde (arriba, sale y gira a la derecha) */}
      <path
        d="M 95 130 C 95 90, 95 60, 95 45 L 130 45"
        fill="none"
        stroke="#7CB342"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path d="M 112 25 L 145 45 L 112 65 Z" fill="#7CB342" />

      {/* Flecha roja (abajo, entra girando desde la derecha) */}
      <path
        d="M 345 245 C 345 275, 345 300, 345 312 L 315 312"
        fill="none"
        stroke="#D9534F"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path d="M 332 292 L 300 312 L 332 332 Z" fill="#D9534F" />

      {/* Carpeta: solapa trasera */}
      <path
        d="M 75 145 L 75 130 C 75 122, 82 115, 90 115 L 150 115
           C 156 115, 161 118, 165 123 L 175 135 C 179 140, 184 143, 190 143
           L 300 143 C 311 143, 320 152, 320 163 L 320 300
           C 320 314, 309 325, 295 325 L 100 325 C 86 325, 75 314, 75 300 Z"
        fill="#FFC97A"
      />

      {/* Carpeta: cuerpo frontal */}
      <path
        d="M 85 165 C 85 155, 93 148, 103 148 L 292 148
           C 305 148, 315 158, 315 171 L 315 305 C 315 317, 305 327, 293 327
           L 107 327 C 92 327, 80 315, 80 300 L 80 200 C 80 185, 82 172, 85 165 Z"
        fill="#FFD897"
      />

      <text
        x="197"
        y="270"
        textAnchor="middle"
        fontFamily="'Arial Rounded MT Bold','Segoe UI',sans-serif"
        fontSize="66"
        fontWeight="800"
        fill="#F2646F"
      >
        FTP
      </text>
    </svg>
  );
}
