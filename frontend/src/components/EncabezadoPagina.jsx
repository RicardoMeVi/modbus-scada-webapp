import { BotonExportarReporte } from "./BotonExportarReporte";

// Fila de título + botón de exportar, repetida en cada pantalla (Dashboard,
// Datos del sitio, SMS, FTP, Fecha/Hora, Alarmas, Medidores) -- así el
// reporte se puede generar sin importar en qué sección esté parado el
// técnico, sin depender de una sola pantalla fija.
export function EncabezadoPagina({ titulo, dispositivo }) {
  return (
    <div className="encabezado-pagina">
      <h2>{titulo}</h2>
      {dispositivo && <BotonExportarReporte dispositivo={dispositivo} />}
    </div>
  );
}
