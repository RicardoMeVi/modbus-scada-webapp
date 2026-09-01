using ModbusScada.Api.Models;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

// Dueño único de las conexiones seriales RTU: a diferencia de TCP (una
// conexión nueva y descartable por ciclo de sondeo/escritura), el puerto
// serial se abre una vez y se reutiliza -- abrir/cerrar un RS-485 cada 5
// segundos es más lento y más propenso a fallos que un connect TCP, y como
// es un bus compartido, dos SerialPort abiertos sobre el mismo COM desde
// este mismo proceso tirarían UnauthorizedAccessException. Por eso tanto
// ModbusPollingService como RealModbusWriter piden la conexión acá en vez
// de abrir su propio SerialPort.
public interface IModbusConnectionFactory
{
    IModbusMaster ObtenerMasterRtu(Dispositivo dispositivo);

    // Cierra y descarta la conexión de un puerto (si existe). Se llama
    // cuando una lectura/escritura falla, para que el próximo intento la
    // reabra desde cero en vez de seguir usando un master en mal estado.
    void CerrarConexionRtu(string puertoSerial);

    // Serializa TODO acceso Modbus a un dispositivo (RTU o TCP) entre el
    // sondeo de fondo (ModbusPollingService, cada 5s) y cualquier
    // escritura que llegue por HTTP en el medio (Guardar de Datos del
    // sitio/FTP/SMS/Fecha-Hora). Reutilizar el mismo IModbusMaster/
    // SerialPort entre ciclos (ver comentario de arriba) evita el error de
    // abrir el puerto dos veces, pero NO evita que dos tareas manden bytes
    // por el mismo cable al mismo tiempo si nadie las coordina -- eso
    // entrelaza las tramas de las dos peticiones en el bus y corrompe
    // ambas de formas impredecibles (caso real: un Guardar de Contraseña
    // UTD confirmaba bien en el momento, pero el valor real en el equipo
    // terminaba siendo otro -- el sondeo de fondo pisó la escritura a
    // mitad de camino). `using var _ = await BloquearAsync(...)` alrededor
    // de cualquier uso del master.
    Task<IDisposable> BloquearAsync(int dispositivoId, CancellationToken ct = default);
}
