import { BotonCopiar } from "./BotonCopiar";

// Insignia "IP:puerto · slave N" repetida en el encabezado de cada tarjeta
// (Datos del sitio, SMS, FTP, Fecha/Hora, Alarmas, Medidores). Con botón
// para copiar la IP:puerto — el dato que más se pega en otro lado (un
// cliente Modbus/FTP, un ping) para verificar la conexión al dispositivo.
export function InsigniaDispositivo({ dispositivo }) {
  const direccion = `${dispositivo.ipAddress}:${dispositivo.puerto}`;
  return (
    <span className="badge badge-copiable">
      {direccion} &middot; slave {dispositivo.slaveId}
      <BotonCopiar valor={direccion} />
    </span>
  );
}
