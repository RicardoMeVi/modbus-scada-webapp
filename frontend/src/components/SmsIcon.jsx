import "./SmsIcon.css";

// Extraído de sms-icon.html: pila de tarjetas con un sello "SMS".
// `size` es el ancho/alto final en px (el viewBox interno es fijo, 400x400).
export function SmsIcon({ size = 320 }) {
  return (
    <svg
      className="sms-icon"
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE1A8" />
          <stop offset="100%" stopColor="#FFB74D" />
        </linearGradient>
        <linearGradient id="cardGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF3D6" />
          <stop offset="100%" stopColor="#FFD98A" />
        </linearGradient>
        <radialGradient id="badgeGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FF7A6E" />
          <stop offset="100%" stopColor="#E8483B" />
        </radialGradient>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Pila de tarjetas, en perspectiva, giradas */}
      <g filter="url(#softShadow)">
        <g transform="translate(200 205) rotate(-8)">
          <rect x="-95" y="-70" width="190" height="140" rx="14" fill="url(#cardGrad)" />
        </g>

        <g transform="translate(205 198) rotate(-2)">
          <rect x="-95" y="-70" width="190" height="140" rx="14" fill="url(#cardGrad)" opacity="0.95" />
          <line x1="-95" y1="-40" x2="95" y2="-40" stroke="#F2A94E" strokeWidth="3" opacity="0.5" />
          <line x1="-95" y1="-20" x2="95" y2="-20" stroke="#F2A94E" strokeWidth="3" opacity="0.5" />
        </g>

        <g transform="translate(195 188) rotate(6)">
          <rect x="-95" y="-70" width="190" height="140" rx="16" fill="url(#cardGradTop)" stroke="#F2C46B" strokeWidth="2" />
          <line x1="-70" y1="-42" x2="20" y2="-42" stroke="#F2B96B" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          <line x1="-70" y1="-26" x2="35" y2="-26" stroke="#F2B96B" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          <line x1="-70" y1="48" x2="10" y2="48" stroke="#F2B96B" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
          <line x1="-70" y1="60" x2="40" y2="60" stroke="#F2B96B" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
        </g>
      </g>

      {/* Sello circular con texto SMS */}
      <g transform="translate(255 165) rotate(20)">
        <circle r="58" fill="url(#badgeGrad)" stroke="#ffffff" strokeWidth="6" />
        <circle r="58" fill="none" stroke="#C43A2F" strokeWidth="2" opacity="0.4" />
        <text
          x="0"
          y="14"
          textAnchor="middle"
          fontFamily="'Arial Rounded MT Bold','Segoe UI',sans-serif"
          fontSize="34"
          fontWeight="800"
          fill="#ffffff"
          transform="rotate(-20)"
        >
          SMS
        </text>
      </g>
    </svg>
  );
}
