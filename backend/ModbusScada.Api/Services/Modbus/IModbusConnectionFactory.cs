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
}
