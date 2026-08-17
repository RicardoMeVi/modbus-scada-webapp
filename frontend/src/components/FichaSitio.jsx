import { useState } from "react";
import { actualizarDatosSitio } from "../api";
import { Toast } from "./Toast";
import { BotonCopiar } from "./BotonCopiar";
import { IconoSeccion } from "./icons/IconoSeccion";

// Datos de identificación del sitio, igual a la pantalla "Datos del sitio"
// del HMI físico (Kinco/ICH): NSM, NSUE, NSUT, RFC, Unidad de verificación,
// Contraseña UTD y coordenadas. No son registros Modbus — son metadatos
// fijos del sitio que se guardan directo en el dispositivo.
export function FichaSitio({ dispositivo }) {
  const [campos, setCampos] = useState({
    nsm: dispositivo.nsm ?? "",
    nsue: dispositivo.nsue ?? "",
    nsut: dispositivo.nsut ?? "",
    rfc: dispositivo.rfc ?? "",
    unidadVerificacion: dispositivo.unidadVerificacion ?? "",
    contrasenaUtd: dispositivo.contrasenaUtd ?? "",
    latitud: dispositivo.latitud ?? "",
    longitud: dispositivo.longitud ?? "",
  });
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null); // "ok" | "error" | null
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  function actualizarCampo(campo, valor) {
    setEstado(null);
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarDatosSitio(dispositivo.id, {
        nsm: campos.nsm || null,
        nsue: campos.nsue || null,
        nsut: campos.nsut || null,
        rfc: campos.rfc || null,
        unidadVerificacion: campos.unidadVerificacion || null,
        contrasenaUtd: campos.contrasenaUtd || null,
        latitud: campos.latitud === "" ? null : Number(campos.latitud),
        longitud: campos.longitud === "" ? null : Number(campos.longitud),
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
        <label>
          NSM
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input value={campos.nsm} onChange={(e) => actualizarCampo("nsm", e.target.value)} />
            <BotonCopiar valor={campos.nsm} />
          </div>
        </label>
        <label>
          RFC
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input value={campos.rfc} onChange={(e) => actualizarCampo("rfc", e.target.value)} />
            <BotonCopiar valor={campos.rfc} />
          </div>
        </label>
        <label>
          NSUE
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input value={campos.nsue} onChange={(e) => actualizarCampo("nsue", e.target.value)} />
            <BotonCopiar valor={campos.nsue} />
          </div>
        </label>
        <label>
          Unidad de verificación
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
          NSUT
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="id-icon" size={16} />
            </span>
            <input value={campos.nsut} onChange={(e) => actualizarCampo("nsut", e.target.value)} />
            <BotonCopiar valor={campos.nsut} />
          </div>
        </label>
        <label>
          Contraseña UTD
          <div className="campo-contrasena campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="candado-icon" size={16} />
            </span>
            <input
              type={mostrarContrasena ? "text" : "password"}
              value={campos.contrasenaUtd}
              onChange={(e) => actualizarCampo("contrasenaUtd", e.target.value)}
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
              <BotonCopiar valor={campos.contrasenaUtd} />
            </div>
          </div>
        </label>
        <label>
          Latitud
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="pin-icon" size={16} />
            </span>
            <input
              type="number"
              step="any"
              value={campos.latitud}
              onChange={(e) => actualizarCampo("latitud", e.target.value)}
            />
            <BotonCopiar valor={campos.latitud} />
          </div>
        </label>
        <label>
          Longitud
          <div className="campo-con-copiar campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="pin-icon" size={16} />
            </span>
            <input
              type="number"
              step="any"
              value={campos.longitud}
              onChange={(e) => actualizarCampo("longitud", e.target.value)}
            />
            <BotonCopiar valor={campos.longitud} />
          </div>
        </label>
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
          mensaje={estado === "ok" ? "Datos del sitio guardados correctamente." : "No se pudo guardar. Intentá de nuevo."}
          onCerrar={() => setEstado(null)}
        />
      )}
    </form>
  );
}
