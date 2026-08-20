using System.IO.Ports;
using NModbus;

namespace ModbusScada.Api.Services.Modbus;

public interface IPuertoSerialDetector
{
    IReadOnlyList<string> ListarPuertosDisponibles();
    Task<string?> DetectarAsync(byte slaveId, CancellationToken ct);
}

// Para la configuración inicial de un sitio real: en vez de pedirle al
// técnico que abra el Administrador de dispositivos y adivine cuál COM es
// el adaptador USB-RS485, se prueba cada puerto serial que Windows ve
// conectado con una lectura Modbus real (registro 15, "Alarmas" -- el mismo
// que ya usa GetAlarmas, confirmado contra la especificación del
// Interrogador portátil) y se usa el primero que responda. Cada intento abre
// su propio SerialPort de corta duración -- no reutiliza el de
// ModbusConnectionFactory porque ese es el que mantiene abierto el ciclo de
// sondeo en segundo plano, y no queremos pisarlo ni depender de que ya haya
// una conexión configurada (todavía no la hay, es justo lo que se busca).
public class PuertoSerialDetector : IPuertoSerialDetector
{
    private const int BaudRate = 9600;
    private const int DataBits = 8;
    private const Parity ParidadPuerto = Parity.None;
    private const StopBits BitsDeParada = StopBits.One;
    private const int TimeoutPorPuertoMs = 500;
    private const int RegistroSonda = 15;

    public IReadOnlyList<string> ListarPuertosDisponibles()
    {
        return SerialPort.GetPortNames().Distinct().OrderBy(p => p).ToList();
    }

    public async Task<string?> DetectarAsync(byte slaveId, CancellationToken ct)
    {
        var modbusFactory = new ModbusFactory();

        foreach (var nombrePuerto in ListarPuertosDisponibles())
        {
            ct.ThrowIfCancellationRequested();

            SerialPort? puerto = null;
            try
            {
                puerto = new SerialPort(nombrePuerto, BaudRate, ParidadPuerto, DataBits, BitsDeParada)
                {
                    ReadTimeout = TimeoutPorPuertoMs,
                    WriteTimeout = TimeoutPorPuertoMs
                };
                puerto.Open();

                var transporte = modbusFactory.CreateRtuTransport(new SerialPortStreamAdapter(puerto));
                var master = modbusFactory.CreateMaster(transporte);
                await master.ReadHoldingRegistersAsync(slaveId, RegistroSonda, 1);

                return nombrePuerto;
            }
            catch
            {
                // Puerto ocupado, nada conectado, o no es el UTD -- se
                // prueba el siguiente sin abortar la búsqueda entera.
            }
            finally
            {
                try
                {
                    puerto?.Close();
                }
                catch
                {
                    // Best-effort.
                }

                puerto?.Dispose();
            }
        }

        return null;
    }
}
