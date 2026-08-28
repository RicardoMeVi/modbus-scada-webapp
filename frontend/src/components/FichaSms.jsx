import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { actualizarSms } from "../api";
import { Toast } from "./Toast";
import { IconoSeccion } from "./icons/IconoSeccion";
import { EstadoTarjeta } from "./EstadoTarjeta";
import { useAlarmas } from "../hooks/useAlarmas";

const CLAVES_CAMPOS = ["numero", "horaEnvio", "minutoEnvio", "tipoMensaje"];

function camposDesde(dispositivo, conectado) {
  return {
    numero: conectado ? dispositivo.smsNumero ?? "" : "",
    horaEnvio: conectado ? dispositivo.smsHoraEnvio ?? "" : "",
    minutoEnvio: conectado ? dispositivo.smsMinutoEnvio ?? "" : "",
    tipoMensaje: conectado && dispositivo.smsTipoMensaje ? String(dispositivo.smsTipoMensaje) : "",
  };
}

function camposIguales(a, b) {
  return CLAVES_CAMPOS.every((clave) => String(a[clave] ?? "") === String(b[clave] ?? ""));
}

// Configuración de SMS, igual a la pantalla "SMS" del HMI físico
// (Kinco/ICH): número de teléfono, hora/minuto de envío automático y tipo
// de mensaje (1 = Mensaje de UV, 3 = Mensaje de prueba). Todos menos tipo
// de mensaje tienen registro Modbus real (ver SiteRegisterMap) y se
// escriben al equipo al guardar. GSM/GPRS/IHM son los mismos bits de
// "Alarmas" -- solo lectura, del mismo GET .../alarmas que la pantalla
// Alarmas, para que las dos digan lo mismo.
//
// Igual que FichaFtp/FichaSitio: estos campos son columnas fijas cacheadas
// en la base, no algo que llegue por SignalR. `conectado` es el mismo
// booleano del badge "En línea"/"Desconectado" del topbar (App.jsx) -- se
// reutiliza para que todos los indicadores digan siempre lo mismo.
export function FichaSms({ dispositivo, conectado }) {
  const { t } = useTranslation();
  const alarmas = useAlarmas(dispositivo.id);
  const [campos, setCampos] = useState(() => camposDesde(dispositivo, conectado));
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // Ver comentario igual en FichaSitio.jsx.
  const ultimoGuardadoRef = useRef(null);

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

  const tipoMensajeValido = campos.tipoMensaje === "1" || campos.tipoMensaje === "3";

  // Un teléfono real son 10 dígitos (LADA + número) — menos que eso no sirve.
  const numeroValido = campos.numero.length === 10;
  const numeroInvalido = campos.numero !== "" && !numeroValido;

  const envioCompleto =
    tipoMensajeValido && numeroValido && campos.horaEnvio !== "" && campos.minutoEnvio !== "";

  function actualizarCampo(campo, valor) {
    setEditando(true);
    setEstado(null);
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  // Solo dígitos de un teléfono, hasta 10 (LADA + número).
  function actualizarNumero(valor) {
    actualizarCampo("numero", valor.replace(/\D/g, "").slice(0, 10));
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

  // Al salir del campo se completa a 2 dígitos (formato 24h: "11:8" -> "11:08").
  function formatearDosDigitos(campo, valor) {
    if (valor === "") return;
    actualizarCampo(campo, valor.padStart(2, "0"));
  }

  // Simulado: todavía no hay integración real con el módem GSM/GPRS de la
  // UTD, así que el envío solo se representa visualmente con el loader.
  function enviarSms() {
    setEnviando(true);
    setEstado(null);
    setTimeout(() => {
      setEnviando(false);
      setEstado("enviado");
      setCampos({ numero: "", horaEnvio: "", minutoEnvio: "", tipoMensaje: "" });
    }, 3000);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarSms(dispositivo.id, {
        numero: campos.numero || null,
        horaEnvio: campos.horaEnvio === "" ? null : Number(campos.horaEnvio),
        minutoEnvio: campos.minutoEnvio === "" ? null : Number(campos.minutoEnvio),
        tipoMensaje: campos.tipoMensaje === "" ? null : Number(campos.tipoMensaje),
      });
      setEstado("ok");
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
          {t("sms.enviarMensajeA")}
          <div className="campo-icono">
            <span className="icono-campo-izq">
              <IconoSeccion id="telefono-icon" size={16} />
            </span>
            <input
              value={campos.numero}
              inputMode="numeric"
              placeholder={t("sms.numeroTelefono")}
              className={numeroInvalido ? "campo-invalido" : undefined}
              disabled={enviando}
              onChange={(e) => actualizarNumero(e.target.value)}
            />
          </div>
          {numeroInvalido && <span className="campo-error">{t("sms.numeroInvalido")}</span>}
        </label>

        <label className="campo-ancho">
          {t("sms.horaEnvioAutomatico")}
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
                disabled={enviando}
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
                disabled={enviando}
                onChange={(e) => actualizarMinuto(e.target.value)}
                onBlur={(e) => formatearDosDigitos("minutoEnvio", e.target.value)}
              />
            </div>
            <span>{t("comun.hrs")}</span>
          </div>
        </label>

        <label className="campo-ancho">
          {t("sms.tipoMensaje")}
          <select
            value={campos.tipoMensaje}
            disabled={enviando}
            onChange={(e) => actualizarCampo("tipoMensaje", e.target.value)}
          >
            <option value="">{t("comun.seleccionaTipo")}</option>
            <option value="1">{t("comun.tipoUv")}</option>
            <option value="3">{t("comun.tipoPrueba")}</option>
          </select>
        </label>
      </div>

      <div className="ficha-pie">
        <p className="ficha-sms-leyenda">{t("comun.leyendaTipoMensaje")}</p>

        {!enviando && tipoMensajeValido && (
          <button
            type="button"
            className="ficha-sitio-guardar"
            disabled={!envioCompleto}
            title={envioCompleto ? undefined : t("sms.completaCampos")}
            onClick={enviarSms}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            {t("sms.enviarBoton")}
          </button>
        )}
      </div>

      {enviando && (
        <div className="envio-sms-centrado">
          <div className="envio-sms-cargando">
            <div className="sms-envio-loader" />
            <span>{t("sms.enviando")}</span>
          </div>
        </div>
      )}

      <div className="estado-tarjetas">
        <EstadoTarjeta clave="gsmConectado" icono="antena-icon" alarmas={alarmas} label={t("sms.gsm")} />
        <EstadoTarjeta clave="gprsConectado" icono="senal-icon" alarmas={alarmas} label={t("sms.gprs")} />
        <EstadoTarjeta clave="ihm" icono="chip-icon" alarmas={alarmas} label={t("sms.ihm")} />
      </div>

      {estado && (
        <Toast
          tipo={estado === "error" ? "error" : "ok"}
          mensaje={
            estado === "ok"
              ? t("sms.toastGuardadoOk")
              : estado === "enviado"
                ? t("sms.toastEnviado")
                : t("sms.toastError")
          }
          onCerrar={() => setEstado(null)}
        />
      )}
    </form>
  );
}
