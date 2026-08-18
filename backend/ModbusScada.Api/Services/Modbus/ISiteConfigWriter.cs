using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Intenta reflejar en el equipo real (vía Modbus) los campos de Datos del
// sitio/SMS/FTP que el usuario acaba de guardar desde la app. Nunca debe
// hacer fallar la petición HTTP que lo llama -- si el equipo está apagado o
// desconectado, el usuario igual puede guardar su configuración localmente.
public interface ISiteConfigWriter
{
    Task EscribirAsync(Dispositivo dispositivo);
}
