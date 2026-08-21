using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Intenta reflejar en el equipo real (vía Modbus) los campos de Datos del
// sitio/SMS/FTP que el usuario acaba de guardar desde la app. Nunca debe
// tirar -- captura sus propios errores de I/O y los devuelve como false, en
// vez de dejar que una excepción tumbe la petición HTTP. El llamador
// (DispositivosController) usa el bool para decidir si persiste local o
// no: solo se guarda si esto devuelve true -- todo o nada, para no dejar
// la base local diciendo algo que el equipo real nunca confirmó.
public interface ISiteConfigWriter
{
    Task<bool> EscribirAsync(Dispositivo dispositivo);
}
