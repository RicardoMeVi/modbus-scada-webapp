import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { actualizarFtp } from "../api";
import { Toast } from "./Toast";
import { BotonCopiar } from "./BotonCopiar";
import { IconoSeccion } from "./icons/IconoSeccion";
import { EstadoTarjeta } from "./EstadoTarjeta";
import { useAlarmas } from "../hooks/useAlarmas";

// IPv4: cuatro octetos 0-255 separados por punto.
const IP_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const CLAVES_CAMPOS = ["ipServidor", "usuario", "contrasena", "carpeta", "horaEnvio", "minutoEnvio", "tipoMensaje"];

function camposIguales(a, b) {
  return CLAVES_CAMPOS.every((clave) => String(a[clave] ?? "") === String(b[clave] ?? ""));
}

// Configuración de FTP, igual a la pantalla "FTP" del HMI físico
// (Kinco/ICH): IP del servidor, usuario, contraseña, carpeta de
// almacenamiento, hora/minuto de envío automático y tipo de mensaje
// (1 = Mensaje de UV, 3 = Mensaje de prueba). Todos menos tipo de mensaje
// tienen registro Modbus real (ver SiteRegisterMap) y se escriben al
// equipo al guardar. Largos máximos según la especificación del
// Interrogador portátil (sección 3: "String N car." por campo). Las
// tarjetas de GSM/GPRS/IHM leen del mismo GET .../alarmas que Alarmas.
//
// A diferencia de Fecha/Hora (que llega por SignalR y arranca vacía en
// cada apertura), estos campos son columnas fijas cacheadas en la base --
// sin el chequeo de abajo, la pantalla mostraba lo último guardado aunque
// el equipo llevara horas desconectado. `conectado` es el mismo booleano
// que ya calcula App.jsx para el badge "En línea"/"Desconectado" del
// topbar -- se reutiliza para que ambos indicadores digan siempre lo
// mismo (antes esta pantalla tenía su propio chequeo de frescura de 60s
// independiente, y podían mostrar cosas distintas al mismo tiempo).
function camposDesde(dispositivo, conectado) {
  return {
    ipServidor: conectado ? dispositivo.ftpIpServidor ?? "" : "",
    usuario: conectado ? dispositivo.ftpUsuario ?? "" : "",
    contrasena: conectado ? dispositivo.ftpContrasena ?? "" : "",
    carpeta: conectado ? dispositivo.ftpCarpeta ?? "" : "",
    horaEnvio: conectado ? dispositivo.ftpHoraEnvio ?? "" : "",
    minutoEnvio: conectado ? dispositivo.ftpMinutoEnvio ?? "" : "",
    tipoMensaje: conectado && dispositivo.ftpTipoMensaje ? String(dispositivo.ftpTipoMensaje) : "",
  };
}

export function FichaFtp({ dispositivo, conectado }) {
  const { t } = useTranslation();
  const alarmas = useAlarmas(dispositivo.id);
  const [campos, setCampos] = useState(() => camposDesde(dispositivo, conectado));
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  // Ver comentario igual en FichaSitio.jsx: protege el valor recién
  // guardado hasta que useDispositivos (refresco cada 10s) lo alcance, para
  // que no se vea "volver" al dato viejo por unos segundos después de
  // guardar.
  const ultimoGuardadoRef = useRef(null);

  // useDispositivos refresca cada 10s (ver ese hook) -- sin este efecto, la
  // pantalla se quedaba con el snapshot del primer render para siempre
  // (useState solo usa su valor inicial una vez) y nunca se enteraba de que
  // el equipo se conectó y trajo datos reales recién. Se frena mientras el
  // usuario está editando para no pisarle lo que está tipeando.
  useEffect(() => {
    if (editando) return;
    const fresco = camposDesde(dispositivo, conectado);
    if (ultimoGuardadoRef.current && !camposIguales(fresco, ultimoGuardadoRef.current)) {
      return;
    }
    ultimoGuardadoRef.current = null;
    setCampos(fresco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispositivo, conectado, editando]);

  // IP, usuario, contraseña y carpeta son obligatorios: una configuración
  // de FTP sin alguno de estos cuatro no sirve para nada (no hay a dónde
  // conectarse). Hora/minuto/tipo de mensaje sí quedan opcionales — son el
  // envío automático, el sitio puede no querer uno programado.
  const ipVacia = campos.ipServidor === "";
  const ipInvalida = !ipVacia && !IP_REGEX.test(campos.ipServidor);
  const faltanCampos = ipVacia || campos.usuario === "" || campos.contrasena === "" || campos.carpeta === "";
  const hayErrores = ipInvalida || faltanCampos;

  function actualizarCampo(campo, valor) {
    setEditando(true);
    setEstado(null);
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  // IP del servidor: solo dígitos y puntos, máximo 13 caracteres (el largo
  // real del registro admite menos que una IPv4 completa en el peor caso,
  // p.ej. "255.255.255.255" no entra — así está documentado el equipo).
  function actualizarIp(valor) {
    actualizarCampo("ipServidor", valor.replace(/[^0-9.]/g, "").slice(0, 13));
  }

  // Usuario: la especificación real (sección 3.3) solo dice "String 17
  // caracteres" — nada sobre qué caracteres admite, así que no se filtra el
  // set (si tu servidor FTP usa un usuario con espacio u otro símbolo, acá
  // entra igual). Solo se respeta el largo máximo real.
  function actualizarUsuario(valor) {
    actualizarCampo("usuario", valor.slice(0, 17));
  }

  // Contraseña: máximo 17 caracteres, sin filtrar el set de caracteres (una
  // contraseña puede llevar símbolos).
  function actualizarContrasena(valor) {
    actualizarCampo("contrasena", valor.slice(0, 17));
  }

  // Carpeta de almacenamiento: igual que Usuario, la especificación real
  // solo dice "String 17 caracteres" — sin restricción de qué caracteres
  // admite, así que una ruta con espacio ("/datos nuevos") entra igual.
  // Solo se respeta el largo máximo real.
  function actualizarCarpeta(valor) {
    actualizarCampo("carpeta", valor.slice(0, 17));
  }

  // Formato 24 horas: no deja escribir una hora fuera de 0-23.
  function actualizarHora(valor) {
    const digitos = valor.replace(/\D/g, "");
    actualizarCampo("horaEnvio", digitos === "" ? "" : String(Math.min(23, Number(digitos))));
  }

  // Minutos válidos: 0-59.
  function actualizarMinuto(valor) {
    const digitos = valor.replace(/\D/g, "");
    actualizarCampo("minutoEnvio", digitos === "" ? "" : String(Math.min(59, Number(digitos))));
  }

  // Al salir del campo se completa a 2 dígitos (formato 24h: "7:5" -> "07:05").
  function formatearDosDigitos(campo, valor) {
    if (valor === "") return;
    actualizarCampo(campo, valor.padStart(2, "0"));
  }

  async function guardar(e) {
    e.preventDefault();
    if (hayErrores) return;
    setGuardando(true);
    try {
      await actualizarFtp(dispositivo.id, {
        ipServidor: campos.ipServidor || null,
        usuario: campos.usuario || null,
        contrasena: campos.contrasena || null,
        carpeta: campos.carpeta || null,
        horaEnvio: campos.horaEnvio || null,
        minutoEnvio: campos.minutoEnvio || null,
        tipoMensaje: campos.tipoMensaje === "" ? null : Number(campos.tipoMensaje),
      });
      setEstado("ok");
      // El backend ya escribió y releyó para confirmar (todo o nada, ver
      // SiteConfigModbusIO) -- volver a seguir la config del equipo en vez
      // de seguir mostrando lo recién tipeado, protegiendo ese valor hasta
      // que el próximo refresco de useDispositivos (10s) lo alcance.
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
        <label className="campo-ancho">
          {t("ftp.ipServidor")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="site-icon" size={16} />
            </span>
            <input
              value={campos.ipServidor}
              placeholder="0.0.0.0"
              inputMode="decimal"
              className={ipInvalida ? "campo-invalido" : undefined}
              onChange={(e) => actualizarIp(e.target.value)}
            />
            <BotonCopiar valor={campos.ipServidor} />
          </div>
          {ipInvalida && <span className="campo-error">{t("ftp.ipInvalida")}</span>}
        </label>
        <label className="campo-ancho">
          {t("ftp.usuario")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="usuario-icon" size={16} />
            </span>
            <input value={campos.usuario} onChange={(e) => actualizarUsuario(e.target.value)} />
            <BotonCopiar valor={campos.usuario} />
          </div>
        </label>

        <label className="campo-ancho">
          {t("ftp.contrasena")}
          <div className="campo-contrasena campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="candado-icon" size={16} />
            </span>
            <input
              type={mostrarContrasena ? "text" : "password"}
              value={campos.contrasena}
              onChange={(e) => actualizarContrasena(e.target.value)}
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
              <BotonCopiar valor={campos.contrasena} />
            </div>
          </div>
        </label>
        <label className="campo-ancho">
          {t("ftp.carpeta")}
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="carpeta-icon" size={16} />
            </span>
            <input value={campos.carpeta} onChange={(e) => actualizarCarpeta(e.target.value)} />
            <BotonCopiar valor={campos.carpeta} />
          </div>
        </label>

        <label>
          {t("ftp.horaEnvioAutomatico")}
          <div className="hora-envio">
            <div className="campo-icono campo-icono-chico">
              <span className="icono-campo-izq">
                <IconoSeccion id="reloj-icon" size={14} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                min="0"
                max="23"
                value={campos.horaEnvio}
                onChange={(e) => actualizarHora(e.target.value)}
                onBlur={(e) => formatearDosDigitos("horaEnvio", e.target.value)}
              />
            </div>
            <span>:</span>
            <div className="campo-icono campo-icono-chico">
              <span className="icono-campo-izq">
                <IconoSeccion id="reloj-icon" size={14} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                min="0"
                max="59"
                value={campos.minutoEnvio}
                onChange={(e) => actualizarMinuto(e.target.value)}
                onBlur={(e) => formatearDosDigitos("minutoEnvio", e.target.value)}
              />
            </div>
            <span>{t("comun.hrs")}</span>
          </div>
        </label>
        <label>
          {t("ftp.tipoMensaje")}
          <select value={campos.tipoMensaje} onChange={(e) => actualizarCampo("tipoMensaje", e.target.value)}>
            <option value="">{t("comun.seleccionaTipo")}</option>
            <option value="1">{t("comun.tipoUv")}</option>
            <option value="3">{t("comun.tipoPrueba")}</option>
          </select>
        </label>
      </div>

      <p className="ficha-sms-leyenda">{t("comun.leyendaTipoMensaje")}</p>

      <div className="estado-tarjetas">
        <EstadoTarjeta clave="gsmConectado" icono="antena-icon" alarmas={alarmas} label={t("ftp.gsm")} />
        <EstadoTarjeta clave="gprsConectado" icono="senal-icon" alarmas={alarmas} label={t("ftp.gprs")} />
        <EstadoTarjeta clave="ihm" icono="chip-icon" alarmas={alarmas} label={t("ftp.ihm")} />
      </div>

      <div className="ficha-sitio-acciones">
        <button
          type="submit"
          className="ficha-sitio-guardar"
          disabled={guardando || hayErrores}
          title={!guardando && faltanCampos ? t("ftp.completaCampos") : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {guardando ? t("comun.guardando") : t("comun.guardar")}
        </button>
      </div>

      {estado && (
        <Toast
          tipo={estado}
          mensaje={estado === "ok" ? t("ftp.toastOk") : t("ftp.toastError")}
          onCerrar={() => setEstado(null)}
        />
      )}
    </form>
  );
}
