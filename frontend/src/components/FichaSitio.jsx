import { useState } from "react";
import { actualizarDatosSitio } from "../api";
import { Toast } from "./Toast";

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
          <input value={campos.nsm} onChange={(e) => actualizarCampo("nsm", e.target.value)} />
        </label>
        <label>
          RFC
          <input value={campos.rfc} onChange={(e) => actualizarCampo("rfc", e.target.value)} />
        </label>
        <label>
          NSUE
          <input value={campos.nsue} onChange={(e) => actualizarCampo("nsue", e.target.value)} />
        </label>
        <label>
          Unidad de verificación
          <input
            value={campos.unidadVerificacion}
            onChange={(e) => actualizarCampo("unidadVerificacion", e.target.value)}
          />
        </label>
        <label>
          NSUT
          <input value={campos.nsut} onChange={(e) => actualizarCampo("nsut", e.target.value)} />
        </label>
        <label>
          Contraseña UTD
          <input
            type="password"
            value={campos.contrasenaUtd}
            onChange={(e) => actualizarCampo("contrasenaUtd", e.target.value)}
          />
        </label>
        <label>
          Latitud
          <input
            type="number"
            step="any"
            value={campos.latitud}
            onChange={(e) => actualizarCampo("latitud", e.target.value)}
          />
        </label>
        <label>
          Longitud
          <input
            type="number"
            step="any"
            value={campos.longitud}
            onChange={(e) => actualizarCampo("longitud", e.target.value)}
          />
        </label>
      </div>

      <div className="ficha-sitio-acciones">
        <button type="submit" className="ficha-sitio-guardar" disabled={guardando}>
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
