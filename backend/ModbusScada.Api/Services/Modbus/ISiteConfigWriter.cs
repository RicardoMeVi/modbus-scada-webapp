using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Intenta escribir en el equipo real (vía Modbus) los campos de Datos del
// sitio/SMS/FTP que el usuario acaba de editar. Nunca tira -- captura sus
// propios errores de I/O y devuelve false. El llamador (DispositivosController)
// solo persiste local si esto devuelve true -- todo o nada, para no dejar
// la base local diciendo algo que el equipo real nunca confirmó.
public interface ISiteConfigWriter
{
    Task<bool> EscribirAsync(Dispositivo dispositivo);
}
