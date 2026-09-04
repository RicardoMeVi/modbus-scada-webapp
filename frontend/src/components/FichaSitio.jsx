import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { actualizarDatosSitio } from "../api";
import { Toast } from "./Toast";
import { BotonCopiar } from "./BotonCopiar";
import { IconoSeccion } from "./icons/IconoSeccion";

// RFC mexicano: 3-4 letras (persona moral/física) + 6 dígitos (fecha) + 3
// caracteres de homoclave = 12 o 13 caracteres en total.
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const CLAVES_CAMPOS = [
  "nsm", "nsue", "nsut", "rfc", "unidadVerificacion", "contrasenaUtd", "latitud", "longitud",
];

function camposDesde(dispositivo, conectado) {
  return {
    nsm: conectado ? dispositivo.nsm ?? "" : "",
    nsue: conectado ? dispositivo.nsue ?? "" : "",
    nsut: conectado ? dispositivo.nsut ?? "" : "",
    rfc: conectado ? dispositivo.rfc ?? "" : "",
    unidadVerificacion: conectado ? dispositivo.unidadVerificacion ?? "" : "",
    contrasenaUtd: conectado ? dispositivo.contrasenaUtd ?? "" : "",
    latitud: conectado ? dispositivo.latitud ?? "" : "",
    longitud: conectado ? dispositivo.longitud ?? "" : "",
  };
}

function camposIguales(a, b) {
  return CLAVES_CAMPOS.every((clave) => String(a[clave] ?? "") === String(b[clave] ?? ""));
}

// Datos de identificación del sitio, igual a la pantalla "Datos del sitio"
// del HMI físico (Kinco/ICH): NSM, NSUE, NSUT, RFC, Unidad de verificación,
// Contraseña UTD y coordenadas. Todos menos Contraseña UTD tienen registro
// Modbus real (ver SiteRegisterMap) y se escriben al equipo al guardar. Los
// largos máximos vienen de la especificación real ("Interrogador portátil",
// sección 3.2: "String N car."). Latitud/Longitud son texto (String 11/15
// en el equipo real) -- se valida el rango numérico por usabilidad, pero
// se guarda y envía el string tal cual, no un número parseado.
// A diferencia de Fecha/Hora (que llega por SignalR y arranca vacía en cada
// apertura), estos campos son columnas fijas cacheadas en la base -- sin el
// chequeo de abajo, la pantalla mostraba lo último guardado aunque el
// equipo llevara horas desconectado. `conectado` es el mismo booleano que
// ya calcula App.jsx para el badge "En línea"/"Desconectado" del topbar
// (viene de lecturas Modbus recientes, no de un timestamp de config de
// sitio aparte) -- se reutiliza para que ambos indicadores digan siempre lo
// mismo. Antes esta pantalla tenía su propio chequeo de frescura (60s)
// independiente del badge, y podían mostrar cosas distintas al mismo
// tiempo.
export function FichaSitio({ dispositivo, conectado }) {
  const { t } = useTranslation();
  const [campos, setCampos] = useState(() => camposDesde(dispositivo, conectado));
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null); // "ok" | "error" | null
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  // Snapshot de lo que se guardó y confirmó la última vez (todo o nada:
  // el backend ya escribió y releyó del equipo real antes de responder
  // "ok"). useDispositivos solo refresca cada 10s por REST -- justo
  // después de guardar, `dispositivo` (el prop) todavía trae el valor
  // VIEJO durante esa ventana. Sin esto, el efecto de abajo pisaba el
  // campo recién guardado con ese valor viejo apenas se apagaba
  // `editando`, y se veía "volver" al dato anterior por unos segundos
  // hasta el próximo refresco. Se limpia solo en cuanto `dispositivo`
  // alcanza lo que ya sabemos confirmado.
  const ultimoGuardadoRef = useRef(null);

  // useDispositivos refresca cada 10s -- sin este efecto la pantalla se
  // quedaba con el snapshot del primer render para siempre. Se frena
  // mientras el usuario está editando para no pisarle lo que está tipeando.
  useEffect(() => {
    if (editando) return;
    const fresco = camposDesde(dispositivo, conectado);
    if (ultimoGuardadoRef.current && !camposIguales(fresco, ultimoGuardadoRef.current)) {
      return; // el REST todavía no alcanzó lo que ya confirmamos guardado
    }
    ultimoGuardadoRef.current = null;
    setCampos(fresco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispositivo, conectado, editando]);

  const rfcInvalido = campos.rfc !== "" && !RFC_REGEX.test(campos.rfc);

  const latitudNum = campos.latitud === "" ? null : Number(campos.latitud);
  const latitudInvalida = latitudNum !== null && (latitudNum < -90 || latitudNum > 90);

  const longitudNum = campos.longitud === "" ? null : Number(campos.longitud);
  const longitudInvalida = longitudNum !== null && (longitudNum < -180 || longitudNum > 180);

  const hayErrores = rfcInvalido || latitudInvalida || longitudInvalida;

  function actualizarCampo(campo, valor) {
    setEditando(true);
    setEstado(null);
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  // NSM/NSUE/NSUT: la especificación real (sección 3.2) solo dice "String
  // 17 caracteres" — nada sobre qué caracteres admite (antes filtraba a
  // solo alfanumérico, una regla inventada sin respaldo, igual que pasaba
  // en FTP con Usuario/Carpeta). Solo se respeta el largo máximo real.
  function actualizarConLargoMaximo(campo, valor, maxLen) {
    actualizarCampo(campo, valor.slice(0, maxLen));
  }

  // RFC: mayúsculas, solo caracteres válidos, máximo 13.
  function actualizarRfc(valor) {
    actualizarCampo("rfc", valor.toUpperCase().replace(/[^A-ZÑ&0-9]/g, "").slice(0, 13));
  }

  // Contraseña UTD: PIN numérico (el equipo real solo tiene teclado
  // numérico para esto), igual que el PIN de la Unidad de Verificación.
  // Máximo 9 dígitos -- el mismo límite que permite el teclado físico de
  // la UTD (ver comentario en SiteRegisterMap.cs sobre el registro de 32
  // bits que hizo falta para poder guardar un valor de este largo).
  function actualizarContrasenaUtd(valor) {
    actualizarCampo("contrasenaUtd", valor.replace(/\D/g, "").slice(0, 9));
  }

  // Latitud/Longitud: solo dígitos, punto y signo negativo, respetando el
  // largo máximo real (11/15 caracteres).
  function actualizarLatitud(valor) {
    actualizarCampo("latitud", valor.replace(/[^0-9.-]/g, "").slice(0, 11));
  }

  function actualizarLongitud(valor) {
    actualizarCampo("longitud", valor.replace(/[^0-9.-]/g, "").slice(0, 15));
  }

  async function guardar(e) {
    e.preventDefault();
    if (hayErrores) return;
    setGuardando(true);
    try {
      await actualizarDatosSitio(dispositivo.id, {
        nsm: campos.nsm || null,
        nsue: campos.nsue || null,
        nsut: campos.nsut || null,
        rfc: campos.rfc || null,
        unidadVerificacion: campos.unidadVerificacion || null,
        contrasenaUtd: campos.contrasenaUtd || null,
        latitud: campos.latitud || null,
        longitud: campos.longitud || null,
      });
      setEstado("ok");
      // El backend ya escribió y releyó para confirmar (todo o nada) --
      // volver a seguir la config del equipo en vez de seguir mostrando lo
      // recién tipeado, pero protegiendo ese valor hasta que el próximo
      // refresco de useDispositivos lo alcance (ver comentario del ref).
      ultimoGuardadoRef.current = { ...campos };
      setEditando(false);
    } catch {
      setEstado("error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="ficha-sitio" onSubmit={guardar}>
      <div className="ficha-sitio-grid">
        <label>
          {t("datosSitio.nsm")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input
              value={campos.nsm}
              onChange={(e) => actualizarConLargoMaximo("nsm", e.target.value, 17)}
            />
            <BotonCopiar valor={campos.nsm} />
          </div>
        </label>
        <label>
          {t("datosSitio.rfc")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input
              value={campos.rfc}
              className={rfcInvalido ? "campo-invalido" : undefined}
              onChange={(e) => actualizarRfc(e.target.value)}
            />
            <BotonCopiar valor={campos.rfc} />
          </div>
          {rfcInvalido && <span className="campo-error">{t("datosSitio.rfcInvalido")}</span>}
        </label>
        <label>
          {t("datosSitio.nsue")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input
              value={campos.nsue}
              onChange={(e) => actualizarConLargoMaximo("nsue", e.target.value, 17)}
            />
            <BotonCopiar valor={campos.nsue} />
          </div>
        </label>
        <label>
          {t("datosSitio.unidadVerificacion")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input
              value={campos.unidadVerificacion}
              onChange={(e) => actualizarCampo("unidadVerificacion", e.target.value)}
            />
            <BotonCopiar valor={campos.unidadVerificacion} />
          </div>
        </label>
        <label>
          {t("datosSitio.nsut")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input
              value={campos.nsut}
              onChange={(e) => actualizarConLargoMaximo("nsut", e.target.value, 17)}
            />
            <BotonCopiar valor={campos.nsut} />
          </div>
        </label>
        <label>
          {t("datosSitio.contrasenaUtd")}
          <div className="campo-contrasena campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="candado-icon" size={16} />
            </span>
            <input
              type={mostrarContrasena ? "text" : "password"}
              inputMode="numeric"
              value={campos.contrasenaUtd}
              onChange={(e) => actualizarContrasenaUtd(e.target.value)}
            />
            <div className="acciones-campo">
              <button
                type="button"
                className="boton-ojo"
                onClick={() => setMostrarContrasena((v) => !v)}
                aria-label={mostrarContrasena ? t("comun.ocultarContrasena") : t("comun.mostrarContrasena")}
              >
                {mostrarContrasena ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
                    <path d="M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-3.06 3.94M6.1 6.1A17.4 17.4 0 0 0 2 11s3.5 7 10 7a10.4 10.4 0 0 0 4.1-.83" />
                  </svg>
                )}
              </button>
              <BotonCopiar valor={campos.contrasenaUtd} />
            </div>
          </div>
        </label>
        <label>
          {t("datosSitio.latitud")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="pin-icon" size={16} />
            </span>
            <input
              type="text"
              inputMode="decimal"
              className={latitudInvalida ? "campo-invalido" : undefined}
              value={campos.latitud}
              onChange={(e) => actualizarLatitud(e.target.value)}
            />
            <BotonCopiar valor={campos.latitud} />
          </div>
          {latitudInvalida && <span className="campo-error">{t("datosSitio.latitudInvalida")}</span>}
        </label>
        <label>
          {t("datosSitio.longitud")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="pin-icon" size={16} />
            </span>
            <input
              type="text"
              inputMode="decimal"
              className={longitudInvalida ? "campo-invalido" : undefined}
              value={campos.longitud}
              onChange={(e) => actualizarLongitud(e.target.value)}
            />
            <BotonCopiar valor={campos.longitud} />
          </div>
          {longitudInvalida && <span className="campo-error">{t("datosSitio.longitudInvalida")}</span>}
        </label>
      </div>

      <div className="ficha-sitio-acciones">
        <button type="submit" className="ficha-sitio-guardar" disabled={guardando || hayErrores}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {guardando ? t("comun.guardando") : t("comun.guardar")}
        </button>
      </div>

      {estado && (
        <Toast
          tipo={estado}
          mensaje={estado === "ok" ? t("datosSitio.toastOk") : t("datosSitio.toastError")}
          onCerrar={() => setEstado(null)}
        />
      )}
    </form>
  );
}
