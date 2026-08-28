import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useModbusHub } from "./hooks/useModbusHub";
import { useDispositivos } from "./hooks/useDispositivos";
import { Sidebar } from "./components/layout/Sidebar";
import { TopbarLines } from "./components/layout/TopbarLines";
import { BotonTema } from "./components/layout/BotonTema";
import { SelectorIdioma } from "./components/layout/SelectorIdioma";
import { Dashboard } from "./pages/Dashboard";
import { DatosDelSitio } from "./pages/DatosDelSitio";
import { Conexion } from "./pages/Conexion";
import { Medidores } from "./pages/Medidores";
import { Mensajes } from "./pages/Mensajes";
import { Ftp } from "./pages/Ftp";
import { FechaHora } from "./pages/FechaHora";
import { Alarmas } from "./pages/Alarmas";
import { SeccionPendiente } from "./pages/SeccionPendiente";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SECCIONES } from "./config/sections";
import logo from "./assets/Logo.png";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [seccionActiva, setSeccionActiva] = useState(SECCIONES[0].id);
  const { lecturas, conectado } = useModbusHub();
  const { dispositivos } = useDispositivos();
  const seccion = SECCIONES.find((s) => s.id === seccionActiva);

  // Sin esto, "hayDatosReales" (abajo) solo se recalcula cuando llega una
  // lectura nueva por SignalR -- si el equipo se desconecta y deja de
  // mandar lecturas, nada dispara un re-render y la última lectura sigue
  // "pareciendo reciente" para siempre (Date.now() no es reactivo solo).
  // Este tick fuerza un re-render cada 5s para que el chequeo de antigüedad
  // se vuelva a evaluar aunque no llegue nada nuevo.
  const [, forzarTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forzarTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // "conectado" (websocket con el backend local) es casi siempre true, aun
  // con el equipo Modbus totalmente desconectado -- no sirve para el
  // indicador que ve el técnico. Acá se exige además que haya llegado
  // alguna lectura real de algún registro configurado, y que sea reciente:
  // `lecturas` se acumula y nunca se limpia (ver useModbusHub), así que sin
  // el chequeo de antigüedad una lectura vieja de antes de desconectar el
  // equipo seguía marcando "En línea" para siempre. El sondeo de fondo es
  // cada 5s (ver ModbusPollingService.PollInterval) -- 20s da margen para
  // reintentos sin parpadear en falso entre ciclos normales.
  const UMBRAL_DATO_RECIENTE_MS = 20_000;
  const hayDatosReales = dispositivos.some((d) =>
    d.registros.some((r) => {
      const lectura = lecturas[r.id];
      if (lectura == null) return false;
      const timestamp = new Date(lectura.timestamp ?? lectura.Timestamp).getTime();
      return Date.now() - timestamp < UMBRAL_DATO_RECIENTE_MS;
    })
  );
  const equipoConectado = conectado && hayDatosReales;

  return (
    <div className="app">
      <header className="topbar">
        <TopbarLines />
        <div className="topbar-izquierda">
          <Link to="/" className="boton-volver-sitio" aria-label={t("comun.volverSitio")}>
            {t("comun.volverSitio")}
          </Link>
          <div className="brand">
            <img src={logo} alt="ICH" className="brand-mark" />
            <div className="brand-text">
              <span className="brand-nombre">ICH</span>
              <h1>{t("comun.panelControl")}</h1>
            </div>
          </div>
        </div>
        <div className="acciones-topbar">
          <SelectorIdioma />
          <BotonTema />
          <span className={`estado-pill ${equipoConectado ? "en-linea" : "desconectado"}`}>
            <span className="estado-dot" />
            {equipoConectado ? t("comun.enLinea") : t("comun.desconectado")}
          </span>
        </div>
      </header>

      <div className="layout">
        <Sidebar activo={seccionActiva} onSeleccionar={setSeccionActiva} />

        <main className="contenido">
          {/* key=seccionActiva: si una sección se rompió y quedó con el
              boundary activado, cambiar de sección arranca un boundary
              nuevo en vez de arrastrar el error a la siguiente pantalla. */}
          <ErrorBoundary key={seccionActiva}>
            {seccionActiva === "dashboard" && (
              <Dashboard lecturas={lecturas} conectado={equipoConectado} onNavegar={setSeccionActiva} />
            )}
            {seccionActiva === "datos-sitio" && <DatosDelSitio conectado={equipoConectado} />}
            {seccionActiva === "conexion" && <Conexion />}
            {seccionActiva === "medidores" && <Medidores lecturas={lecturas} />}
            {seccionActiva === "mensajes" && <Mensajes conectado={equipoConectado} />}
            {seccionActiva === "ftp" && <Ftp conectado={equipoConectado} />}
            {seccionActiva === "fecha-hora" && <FechaHora lecturas={lecturas} />}
            {seccionActiva === "alarmas" && <Alarmas />}
            {!["dashboard", "datos-sitio", "conexion", "medidores", "mensajes", "ftp", "fecha-hora", "alarmas"].includes(seccionActiva) && (
              <SeccionPendiente id={seccion?.id} titulo={seccion ? t(seccion.labelKey) : ""} icono={seccion?.icon} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
