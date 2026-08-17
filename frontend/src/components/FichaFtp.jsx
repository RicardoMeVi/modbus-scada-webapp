import { useState } from "react";
import { actualizarFtp } from "../api";
import { Toast } from "./Toast";
import { BotonCopiar } from "./BotonCopiar";
import { IconoSeccion } from "./icons/IconoSeccion";

// Configuración de FTP, igual a la pantalla "FTP" del HMI físico
// (Kinco/ICH): IP del servidor, usuario, contraseña, carpeta de
// almacenamiento, hora/minuto de envío automático y tipo de mensaje
// (1 = Mensaje de UV, 3 = Mensaje de prueba). No son registros Modbus.
export function FichaFtp({ dispositivo }) {
  const [campos, setCampos] = useState({
    ipServidor: dispositivo.ftpIpServidor ?? "",
    usuario: dispositivo.ftpUsuario ?? "",
    contrasena: dispositivo.ftpContrasena ?? "",
    carpeta: dispositivo.ftpCarpeta ?? "",
    horaEnvio: dispositivo.ftpHoraEnvio ?? "",
    minutoEnvio: dispositivo.ftpMinutoEnvio ?? "",
    tipoMensaje: dispositivo.ftpTipoMensaje ? String(dispositivo.ftpTipoMensaje) : "",
  });
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  function actualizarCampo(campo, valor) {
    setEstado(null);
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarFtp(dispositivo.id, {
        ipServidor: campos.ipServidor || null,
        usuario: campos.usuario || null,
        contrasena: campos.contrasena || null,
        carpeta: campos.carpeta || null,
        horaEnvio: campos.horaEnvio === "" ? null : Number(campos.horaEnvio),
        minutoEnvio: campos.minutoEnvio === "" ? null : Number(campos.minutoEnvio),
        tipoMensaje: campos.tipoMensaje === "" ? null : Number(campos.tipoMensaje),
      });
      setEstado("ok");
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
          IP del servidor
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="site-icon" size={16} />
            </span>
            <input
              value={campos.ipServidor}
              placeholder="0.0.0.0"
              onChange={(e) => actualizarCampo("ipServidor", e.target.value)}
            />
            <BotonCopiar valor={campos.ipServidor} />
          </div>
        </label>
        <label className="campo-ancho">
          Usuario
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="usuario-icon" size={16} />
            </span>
            <input value={campos.usuario} onChange={(e) => actualizarCampo("usuario", e.target.value)} />
            <BotonCopiar valor={campos.usuario} />
          </div>
        </label>

        <label className="campo-ancho">
          Contraseña
          <div className="campo-contrasena campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="candado-icon" size={16} />
            </span>
            <input
              type={mostrarContrasena ? "text" : "password"}
              value={campos.contrasena}
              onChange={(e) => actualizarCampo("contrasena", e.target.value)}
            />
            <div className="acciones-campo">
              <button
                type="button"
                className="boton-ojo"
                onClick={() => setMostrarContrasena((v) => !v)}
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
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
          Carpeta de almacenamiento
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="carpeta-icon" size={16} />
            </span>
            <input value={campos.carpeta} onChange={(e) => actualizarCampo("carpeta", e.target.value)} />
            <BotonCopiar valor={campos.carpeta} />
          </div>
        </label>

        <label>
          Hora de envío automático
          <div className="hora-envio">
            <div className="campo-icono campo-icono-chico">
              <span className="icono-campo-izq">
                <IconoSeccion id="reloj-icon" size={14} />
              </span>
              <input
                type="number"
                min="0"
                max="23"
                value={campos.horaEnvio}
                onChange={(e) => actualizarCampo("horaEnvio", e.target.value)}
              />
            </div>
            <span>:</span>
            <div className="campo-icono campo-icono-chico">
              <span className="icono-campo-izq">
                <IconoSeccion id="reloj-icon" size={14} />
              </span>
              <input
                type="number"
                min="0"
                max="59"
                value={campos.minutoEnvio}
                onChange={(e) => actualizarCampo("minutoEnvio", e.target.value)}
              />
            </div>
            <span>hrs</span>
          </div>
        </label>
        <label>
          Tipo de mensaje
          <select value={campos.tipoMensaje} onChange={(e) => actualizarCampo("tipoMensaje", e.target.value)}>
            <option value="">Selecciona el tipo</option>
            <option value="1">1 · Mensaje de UV</option>
            <option value="3">3 · Mensaje de prueba</option>
          </select>
        </label>
      </div>

      <p className="ficha-sms-leyenda">1 = Mensaje de UV &middot; 3 = Mensaje de prueba</p>

      <div className="estado-tarjetas">
        <div className="estado-tarjeta mal">
          <div className="estado-tarjeta-icono">
            <IconoSeccion id="antena-icon" size={19} />
          </div>
          <div className="estado-tarjeta-texto">
            <span className="estado-tarjeta-label">GSM</span>
            <span className="estado-tarjeta-sub">Estado de conexión</span>
            <span className="estado-tarjeta-pill">
              <span className="estado-dot" /> Desconectado
            </span>
          </div>
        </div>
        <div className="estado-tarjeta mal">
          <div className="estado-tarjeta-icono">
            <IconoSeccion id="senal-icon" size={19} />
          </div>
          <div className="estado-tarjeta-texto">
            <span className="estado-tarjeta-label">GPRS</span>
            <span className="estado-tarjeta-sub">Estado de conexión</span>
            <span className="estado-tarjeta-pill">
              <span className="estado-dot" /> Desconectado
            </span>
          </div>
        </div>
        <div className="estado-tarjeta ok">
          <div className="estado-tarjeta-icono">
            <IconoSeccion id="chip-icon" size={19} />
          </div>
          <div className="estado-tarjeta-texto">
            <span className="estado-tarjeta-label">IHM</span>
            <span className="estado-tarjeta-sub">Estado de conexión</span>
            <span className="estado-tarjeta-pill">
              <span className="estado-dot" /> Conectado
            </span>
          </div>
        </div>
      </div>

      <div className="ficha-sitio-acciones">
        <button type="submit" className="ficha-sitio-guardar" disabled={guardando}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {estado && (
        <Toast
          tipo={estado}
          mensaje={estado === "ok" ? "Configuración de FTP guardada correctamente." : "No se pudo guardar. Intentá de nuevo."}
          onCerrar={() => setEstado(null)}
        />
      )}
    </form>
  );
}
