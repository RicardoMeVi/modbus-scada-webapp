using ModbusScada.Api.Models;

namespace ModbusScada.Api.Services.Modbus;

// Intenta escribir en el equipo real (vía Modbus) los campos de Datos del
// sitio/SMS/FTP que el usuario acaba de editar. Nunca tira -- captura sus
// propios errores de I/O y devuelve false. El llamador (DispositivosController)
// solo persiste local si esto devuelve true -- todo o nada, para no dejar
// la base local diciendo algo que el equipo real nunca confirmó.
//
// `camposModificados`: nombres de propiedad (nameof(Dispositivo.X)) que
// realmente cambiaron respecto a lo que ya había en la base -- solo esos
// se escriben. Antes se reescribían TODOS los campos con valor en cada
// guardado (aunque no los tocara el usuario), lo que sumaba escrituras
// innecesarias (más lento, y más exposición al bug de "flashea y
// revierte" en campos que ni se querían cambiar -- calcado del propio
// equipo real, que tampoco reescribe un campo si no lo editaste).
public interface ISiteConfigWriter
{
    Task<bool> EscribirAsync(Dispositivo dispositivo, IReadOnlySet<string> camposModificados);
}
