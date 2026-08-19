import { useState } from "react";
import { useTranslation } from "react-i18next";
import ExcelJS from "exceljs";
import { getReporte } from "../api";
import { Toast } from "./Toast";

// Ícono tal cual el componente de Uiverse.io original (relleno sólido, no
// el estilo de línea fina del resto de la app) -- se deja inline en vez de
// sumarlo al sprite compartido (icons.svg) porque es de un estilo visual
// distinto, pensado solo para este botón puntual.
function IconoDescarga() {
  return (
    <svg fill="#fff" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 50 50" aria-hidden="true">
      <path d="M28.8125 .03125L.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375L0 43.65625C0 44.136719 .339844 44.566406 .8125 44.65625L28.8125 49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM36 13L44 13L44 15L36 15ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z" />
    </svg>
  );
}

// "Foto" del sitio (configuración + últimas lecturas + alarmas) como Excel
// descargable, con una hoja por sección -- para que un técnico se la lleve
// como constancia sin depender de que otra notebook tenga la misma base de
// datos local (cada notebook guarda su propio historial, no se comparte
// entre equipos). No incluye contraseñas -- ver comentario en GetReporte.
//
// Se genera el .xlsx en el propio navegador (librería exceljs) a partir del
// JSON que ya devuelve el backend, en vez de armar el archivo del lado del
// servidor -- así no hace falta tocar el backend si el formato cambia.
export function BotonExportarReporte({ dispositivo }) {
  const { t } = useTranslation();
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(false);
  const [listo, setListo] = useState(false);

  async function exportar() {
    setExportando(true);
    setError(false);
    setListo(false);
    try {
      const reporte = await getReporte(dispositivo.id);
      const buffer = await armarLibro(reporte, t);

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const nombreArchivo = `reporte-${dispositivo.nombre.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
      setListo(true);
    } catch {
      setError(true);
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <button type="button" className="boton-exportar" onClick={exportar} disabled={exportando}>
        <IconoDescarga />
        {exportando ? t("comun.exportando") : t("comun.exportarReporte")}
      </button>
      {error && (
        <Toast tipo="error" mensaje={t("comun.exportarError")} onCerrar={() => setError(false)} />
      )}
      {listo && (
        <Toast tipo="ok" mensaje={t("comun.exportarListo")} onCerrar={() => setListo(false)} />
      )}
    </>
  );
}

function textoEstado(valor, t) {
  if (valor === null || valor === undefined) return t("comun.sinDato");
  return valor ? t("comun.estadoDesconectado") : t("comun.conectado");
}

async function armarLibro(reporte, t) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ICH";
  workbook.created = new Date();

  const hojaConfig = workbook.addWorksheet(t("reporte.hojaConfiguracion"));
  hojaConfig.columns = [
    { header: t("reporte.campo"), key: "campo", width: 28 },
    { header: t("reporte.valor"), key: "valor", width: 40 },
  ];
  hojaConfig.addRows([
    { campo: t("reporte.nombre"), valor: reporte.nombre },
    { campo: t("reporte.generadoEn"), valor: new Date(reporte.generadoEn).toLocaleString() },
    { campo: t("reporte.tipoConexion"), valor: reporte.conexion === 1 ? "RTU" : "TCP" },
    { campo: t("reporte.ipAddress"), valor: reporte.ipAddress },
    { campo: t("reporte.puerto"), valor: reporte.puerto },
    { campo: t("reporte.puertoSerial"), valor: reporte.puertoSerial },
    { campo: t("reporte.slaveId"), valor: reporte.slaveId },
    { campo: t("datosSitio.nsm"), valor: reporte.nsm },
    { campo: t("datosSitio.nsue"), valor: reporte.nsue },
    { campo: t("datosSitio.nsut"), valor: reporte.nsut },
    { campo: t("datosSitio.rfc"), valor: reporte.rfc },
    { campo: t("datosSitio.unidadVerificacion"), valor: reporte.unidadVerificacion },
    { campo: t("datosSitio.latitud"), valor: reporte.latitud },
    { campo: t("datosSitio.longitud"), valor: reporte.longitud },
    { campo: t("sms.numeroTelefono"), valor: reporte.smsNumero },
    { campo: t("reporte.smsEnvio"), valor: horaMinuto(reporte.smsHoraEnvio, reporte.smsMinutoEnvio) },
    { campo: t("ftp.ipServidor"), valor: reporte.ftpIpServidor },
    { campo: t("ftp.usuario"), valor: reporte.ftpUsuario },
    { campo: t("ftp.carpeta"), valor: reporte.ftpCarpeta },
    { campo: t("reporte.ftpEnvio"), valor: horaMinuto(reporte.ftpHoraEnvio, reporte.ftpMinutoEnvio) },
  ]);
  hojaConfig.getRow(1).font = { bold: true };

  const hojaAlarmas = workbook.addWorksheet(t("reporte.hojaAlarmas"));
  hojaAlarmas.columns = [
    { header: t("reporte.alarma"), key: "alarma", width: 28 },
    { header: t("reporte.estado"), key: "estado", width: 20 },
  ];
  hojaAlarmas.addRows([
    { alarma: t("alarmas.alimentacion"), estado: textoEstado(reporte.alarmas.alimentacion, t) },
    { alarma: t("alarmas.bateria"), estado: textoEstado(reporte.alarmas.bateria, t) },
    { alarma: t("alarmas.comunicacionTxCaudal"), estado: textoEstado(reporte.alarmas.comunicacionTxCaudal, t) },
    { alarma: t("alarmas.gsmConectado"), estado: textoEstado(reporte.alarmas.gsmConectado, t) },
    { alarma: t("alarmas.gprsConectado"), estado: textoEstado(reporte.alarmas.gprsConectado, t) },
    { alarma: t("alarmas.ihm"), estado: textoEstado(reporte.alarmas.ihm, t) },
  ]);
  hojaAlarmas.getRow(1).font = { bold: true };

  const hojaLecturas = workbook.addWorksheet(t("reporte.hojaLecturas"));
  hojaLecturas.columns = [
    { header: t("reporte.registro"), key: "registro", width: 26 },
    { header: t("reporte.valor"), key: "valor", width: 16 },
    { header: t("reporte.unidad"), key: "unidad", width: 12 },
    { header: t("reporte.fechaHora"), key: "fecha", width: 22 },
  ];
  hojaLecturas.addRows(
    reporte.ultimasLecturas.map((l) => ({
      registro: l.nombre,
      valor: l.valor,
      unidad: l.unidad ?? "",
      fecha: l.timestamp ? new Date(l.timestamp).toLocaleString() : t("comun.sinDato"),
    }))
  );
  hojaLecturas.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

function horaMinuto(hora, minuto) {
  if (hora === null || hora === undefined || minuto === null || minuto === undefined) return null;
  return `${hora}:${minuto}`;
}
