import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useModbusHub } from "./hooks/useModbusHub";
import { useDispositivos } from "./hooks/useDispositivos";
import { useEquipoConectado } from "./hooks/useEquipoConectado";
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
import { Toast } from "./components/Toast";
import { SECCIONES } from "./config/sections";
import logo from "./assets/Logo.png";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [seccionActiva, setSeccionActiva] = useState(SECCIONES[0].id);
  const { lecturas, conectado, avisoNoSostenido, limpiarAvisoNoSostenido } = useModbusHub();
  const { dispositivos } = useDispositivos();
  const seccion = SECCIONES.find((s) => s.id === seccionActiva);

  // "conectado" (websocket con el backend local) es casi siempre true, aun
  // con el equipo Modbus totalmente desconectado -- no sirve para el
  // indicador que ve el técnico. useEquipoConectado exige además una
  // lectura real reciente (ver ese hook para el detalle y el umbral).
  const equipoConectado = useEquipoConectado(dispositivos, lecturas, conectado);

  // Si el equipo se conecta mientras el técnico está parado en "Conexión"
  // (ej. reconectó el cable), sacarlo de ahí -- el ítem del sidebar ya
  // desaparece (ver Sidebar), pero sin esto la página seguía montada y
  // accesible por el estado ya elegido.
  useEffect(() => {
    if (equipoConectado && seccionActiva === "conexion") {
      setSeccionActiva("dashboard");
    }
  }, [equipoConectado, seccionActiva]);

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
        <Sidebar activo={seccionActiva} onSeleccionar={setSeccionActiva} ocultarConexion={equipoConectado} />

        <main className="contenido">
          {/* key=seccionActiva: si una sección se rompió y quedó con el
              boundary activado, cambiar de sección arranca un boundary
              nuevo en vez de arrastrar el error a la siguiente pantalla. */}
          <ErrorBoundary key={seccionActiva}>
            {seccionActiva === "dashboard" && (
              <Dashboard lecturas={lecturas} conectado={equipoConectado} onNavegar={setSeccionActiva} />
            )}
            {seccionActiva === "datos-sitio" && <DatosDelSitio conectado={equipoConectado} />}
            {seccionActiva === "conexion" && <Conexion conectado={equipoConectado} />}
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

      {/* Llega unos segundos después de un toast de "guardado correctamente"
          -- ver RealSiteConfigWriter.RevisarDespuesAsync: la confirmación
          rápida del guardado no alcanza a detectar todos los reverts, así
          que este es el aviso honesto de que en realidad no se sostuvo. */}
      {avisoNoSostenido && (
        <Toast
          tipo="error"
          mensaje={t("comun.avisoNoSostenido", {
            dispositivo: avisoNoSostenido.dispositivoNombre ?? avisoNoSostenido.DispositivoNombre,
            campos: (avisoNoSostenido.campos ?? avisoNoSostenido.Campos ?? []).join(", "),
          })}
          onCerrar={limpiarAvisoNoSostenido}
        />
      )}
    </div>
  );
}

export default App;
