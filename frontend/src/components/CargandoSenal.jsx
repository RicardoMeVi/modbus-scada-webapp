import { useTranslation } from "react-i18next";
import "./CargandoSenal.css";

// Loader "onda expansiva" (fiel al isotipo ICH) que se muestra en
// PantallaSitio mientras todavía no hay señal real del equipo (ver
// useEquipoConectado). Sin esto, un técnico podía tipear el PIN correcto
// justo en los primeros segundos después de abrir la app -- antes de que el
// sondeo de fondo confirmara la Contraseña UTD vigente -- y el backend lo
// rechazaba contra un valor todavía no actualizado, mostrando "incorrecto"
// para una contraseña que en realidad sí era la correcta.
export function CargandoSenal() {
  const { t } = useTranslation();

  return (
    <div className="cargando-senal">
      <div className="ripple-loader">
        <svg viewBox="0 0 300 300">
          <g className="shadow" transform="translate(2,16)">
            <path className="crescent" d="M 288.68 144.39 L 274.15 131.18 L 250.38 117.31 L 223.30 107.41 L 203.49 103.44 L 195.90 81.98 L 187.97 66.13 L 176.08 48.30 L 153.96 26.18 L 140.09 16.93 L 128.54 11.98 L 153.96 9.67 L 188.30 14.95 L 217.36 26.84 L 240.47 42.69 L 257.31 59.53 L 275.80 88.58 L 285.05 113.68 L 287.69 126.23 L 288.68 144.39 Z" />
            <path className="crescent" d="M 157.92 290.33 L 134.81 289.01 L 111.04 283.73 L 91.89 276.46 L 63.82 260.94 L 103.77 269.20 L 144.06 269.20 L 160.57 266.56 L 181.70 260.61 L 214.39 245.09 L 203.82 258.30 L 179.06 282.41 L 169.81 289.01 L 157.92 290.33 Z" />
            <path className="c1" d="M 51.60 224.95 L 27.83 219.67 L 18.92 200.19 L 37.08 201.84 L 54.25 207.78 L 51.60 224.95 Z" />
            <path className="c2" d="M 60.19 191.93 L 32.45 183.35 L 13.30 181.37 L 10.33 166.51 L 9.67 151.32 L 14.62 150.99 L 33.11 154.95 L 48.30 160.24 L 68.77 170.14 L 70.42 172.45 L 60.19 191.93 Z" />
            <path className="c3" d="M 82.64 154.95 L 66.13 144.39 L 43.02 133.16 L 11.65 124.91 L 15.61 109.06 L 22.55 92.22 L 46.98 102.12 L 67.45 112.69 L 83.30 123.25 L 96.84 136.13 L 98.16 138.77 L 82.64 154.95 Z" />
            <path className="c4" d="M 118.96 123.25 L 107.41 108.40 L 92.55 93.54 L 80.66 84.29 L 59.53 72.41 L 38.07 66.13 L 44.01 58.21 L 64.81 38.73 L 87.26 47.97 L 105.09 59.86 L 124.58 78.02 L 140.42 99.15 L 146.37 111.04 L 132.17 115.99 L 118.96 123.25 Z" />
          </g>

          <path className="fg crescent" d="M 288.68 144.39 L 274.15 131.18 L 250.38 117.31 L 223.30 107.41 L 203.49 103.44 L 195.90 81.98 L 187.97 66.13 L 176.08 48.30 L 153.96 26.18 L 140.09 16.93 L 128.54 11.98 L 153.96 9.67 L 188.30 14.95 L 217.36 26.84 L 240.47 42.69 L 257.31 59.53 L 275.80 88.58 L 285.05 113.68 L 287.69 126.23 L 288.68 144.39 Z" />
          <path className="fg crescent" d="M 157.92 290.33 L 134.81 289.01 L 111.04 283.73 L 91.89 276.46 L 63.82 260.94 L 103.77 269.20 L 144.06 269.20 L 160.57 266.56 L 181.70 260.61 L 214.39 245.09 L 203.82 258.30 L 179.06 282.41 L 169.81 289.01 L 157.92 290.33 Z" />
          <path className="fg c1" d="M 51.60 224.95 L 27.83 219.67 L 18.92 200.19 L 37.08 201.84 L 54.25 207.78 L 51.60 224.95 Z" />
          <path className="fg c2" d="M 60.19 191.93 L 32.45 183.35 L 13.30 181.37 L 10.33 166.51 L 9.67 151.32 L 14.62 150.99 L 33.11 154.95 L 48.30 160.24 L 68.77 170.14 L 70.42 172.45 L 60.19 191.93 Z" />
          <path className="fg c3" d="M 82.64 154.95 L 66.13 144.39 L 43.02 133.16 L 11.65 124.91 L 15.61 109.06 L 22.55 92.22 L 46.98 102.12 L 67.45 112.69 L 83.30 123.25 L 96.84 136.13 L 98.16 138.77 L 82.64 154.95 Z" />
          <path className="fg c4" d="M 118.96 123.25 L 107.41 108.40 L 92.55 93.54 L 80.66 84.29 L 59.53 72.41 L 38.07 66.13 L 44.01 58.21 L 64.81 38.73 L 87.26 47.97 L 105.09 59.86 L 124.58 78.02 L 140.42 99.15 L 146.37 111.04 L 132.17 115.99 L 118.96 123.25 Z" />
        </svg>
      </div>
      <span className="cargando-senal-texto">{t("pantallaSitio.buscandoSenal")}</span>
    </div>
  );
}
